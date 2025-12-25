/**
 * Web Worker for parallel seed searching
 * Loads WASM module and evaluates filters across seed ranges
 */

import type { FilterCondition, FilterGroup } from '$lib/types/filters';
import { getDaysFromSpec } from '$lib/utils/daySpec';

// Message types
export type WorkerRequest =
  | { type: 'init' }
  | { type: 'search'; id: string; startSeed: number; endSeed: number; filter: FilterGroup; maxResults: number; version: string }
  | { type: 'cancel'; id: string };

export type WorkerResponse =
  | { type: 'ready' }
  | { type: 'progress'; id: string; checked: number; found: number }
  | { type: 'match'; id: string; seed: number }
  | { type: 'complete'; id: string; checked: number; matches: number[] }
  | { type: 'error'; id: string; message: string };

// WASM module reference
let wasm: typeof import('rasmodius') | null = null;
let currentSearchId: string | null = null;
let cancelled = false;

// Initialize WASM module
async function init() {
  try {
    // Dynamic import and initialize WASM
    const wasmModule = await import('rasmodius');
    // Call the default export (init function) to initialize WASM
    await wasmModule.default();
    wasm = wasmModule;
    self.postMessage({ type: 'ready' } as WorkerResponse);
  } catch (e) {
    self.postMessage({ type: 'error', id: '', message: `Failed to load WASM: ${e}` } as WorkerResponse);
  }
}

// Evaluate a single condition for a seed
function evaluateCondition(seed: number, condition: FilterCondition, version: string): boolean {
  if (!wasm) return false;

  switch (condition.type) {
    case 'daily_luck': {
      const days = getDaysFromSpec(condition.daySpec);
      for (const day of days) {
        const luck = wasm.get_daily_luck(seed, day, 0, false);
        const minLuck = condition.minLuck ?? -1;
        const maxLuck = condition.maxLuck ?? 1;
        if (luck >= minLuck && luck <= maxLuck) {
          return true;
        }
      }
      return false;
    }

    case 'night_event': {
      const days = getDaysFromSpec(condition.daySpec);
      const eventMap: Record<string, number> = {
        'fairy': 1, 'witch': 2, 'meteor': 3, 'ufo': 4, 'owl': 5
      };
      for (const day of days) {
        const event = wasm.get_night_event(seed, day, version);
        if (condition.eventType === 'any' && event > 0) {
          return true;
        }
        if (eventMap[condition.eventType] === event) {
          return true;
        }
      }
      return false;
    }

    case 'cart_item': {
      const days = getDaysFromSpec(condition.daySpec);
      // Filter to only cart days (Friday=5, Sunday=7)
      const cartDays = days.filter(d => {
        const dow = ((d - 1) % 7) + 1;
        return dow === 5 || dow === 7;
      });
      for (const day of cartDays) {
        const cart = wasm.get_traveling_cart(seed, day, version);
        for (let i = 0; i < cart.length; i += 3) {
          const itemId = cart[i];
          const price = cart[i + 1];
          if (itemId === condition.itemId) {
            if (condition.maxPrice === undefined || price <= condition.maxPrice) {
              return true;
            }
          }
        }
      }
      return false;
    }

    case 'geode': {
      const geodeTypeMap: Record<string, number> = {
        'geode': 0, 'frozen': 1, 'magma': 2, 'omni': 3, 'trove': 4, 'coconut': 5
      };
      const result = wasm.get_geode_item(
        seed,
        condition.geodeNumber,
        geodeTypeMap[condition.geodeType],
        120,
        version
      );
      return condition.targetItems.includes(result[0]);
    }

    case 'dish_of_day': {
      const days = getDaysFromSpec(condition.daySpec);
      for (const day of days) {
        const dish = wasm.get_dish_of_the_day(seed, day, 0);
        if (dish[0] === condition.dishId) {
          return true;
        }
      }
      return false;
    }

    case 'weather': {
      const days = getDaysFromSpec(condition.daySpec);
      const weatherMap: Record<string, number> = {
        'sunny': 0, 'rain': 1, 'windy': 2, 'storm': 3, 'snow': 5
      };
      for (const day of days) {
        const weather = wasm.get_weather_tomorrow(seed, day, 0, 0, false, version);
        if (condition.weatherType === 'any' && weather !== 0) {
          // Any non-sunny weather
          return true;
        }
        if (weatherMap[condition.weatherType] === weather) {
          return true;
        }
      }
      return false;
    }

    case 'mine_floor': {
      const days = getDaysFromSpec(condition.daySpec);
      for (const day of days) {
        // Check each floor in the range
        let passesAll = true;

        // Check no monsters requirement
        if (condition.noMonsters) {
          const monsterFloors = wasm.find_monster_floors(
            seed, day,
            condition.floorRange.start,
            condition.floorRange.end,
            version
          );
          if (monsterFloors.length > 0) {
            passesAll = false;
          }
        }

        // Check no dark requirement
        if (passesAll && condition.noDark) {
          const darkFloors = wasm.find_dark_floors(
            seed, day,
            condition.floorRange.start,
            condition.floorRange.end
          );
          if (darkFloors.length > 0) {
            passesAll = false;
          }
        }

        // Check mushroom requirement (only on floors 81+)
        if (passesAll && condition.hasMushroom) {
          const mushStart = Math.max(condition.floorRange.start, 81);
          const mushEnd = condition.floorRange.end;
          if (mushStart <= mushEnd) {
            const mushroomFloors = wasm.find_mushroom_floors(
              seed, day,
              mushStart,
              mushEnd,
              version
            );
            if (mushroomFloors.length === 0) {
              passesAll = false;
            }
          } else {
            // Range doesn't include 81+, can't have mushroom floors
            passesAll = false;
          }
        }

        if (passesAll) {
          return true;
        }
      }
      return false;
    }

    default:
      return false;
  }
}

// Evaluate a filter group (AND/OR logic)
function evaluateGroup(seed: number, group: FilterGroup, version: string): boolean {
  if (group.conditions.length === 0) return true;

  if (group.logic === 'and') {
    // All conditions must match
    for (const item of group.conditions) {
      const result = 'logic' in item
        ? evaluateGroup(seed, item, version)
        : evaluateCondition(seed, item, version);
      if (!result) return false;
    }
    return true;
  } else {
    // Any condition must match
    for (const item of group.conditions) {
      const result = 'logic' in item
        ? evaluateGroup(seed, item, version)
        : evaluateCondition(seed, item, version);
      if (result) return true;
    }
    return false;
  }
}

// Main search function
async function search(
  id: string,
  startSeed: number,
  endSeed: number,
  filter: FilterGroup,
  maxResults: number,
  version: string
) {
  if (!wasm) {
    self.postMessage({ type: 'error', id, message: 'WASM not loaded' } as WorkerResponse);
    return;
  }

  currentSearchId = id;
  cancelled = false;
  const matches: number[] = [];
  const batchSize = 10000;
  let checked = 0;

  for (let seed = startSeed; seed <= endSeed && matches.length < maxResults && !cancelled; seed++) {
    if (evaluateGroup(seed, filter, version)) {
      matches.push(seed);
      self.postMessage({ type: 'match', id, seed } as WorkerResponse);
    }

    checked++;

    // Report progress every batch
    if (checked % batchSize === 0) {
      self.postMessage({
        type: 'progress',
        id,
        checked,
        found: matches.length
      } as WorkerResponse);

      // Yield to allow cancel messages to be processed
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }

  self.postMessage({
    type: 'complete',
    id,
    checked,
    matches
  } as WorkerResponse);

  currentSearchId = null;
}

// Handle messages from main thread
self.onmessage = async (e: MessageEvent<WorkerRequest>) => {
  const msg = e.data;

  switch (msg.type) {
    case 'init':
      await init();
      break;

    case 'search':
      await search(msg.id, msg.startSeed, msg.endSeed, msg.filter, msg.maxResults, msg.version);
      break;

    case 'cancel':
      if (currentSearchId === msg.id) {
        cancelled = true;
      }
      break;
  }
};

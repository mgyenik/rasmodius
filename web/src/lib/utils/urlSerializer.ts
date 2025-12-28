/**
 * URL serialization for filter sharing
 *
 * Encodes filters to compact URL-safe strings and decodes them back.
 * Uses base64-encoded JSON with optional compression for longer filters.
 */

import type { FilterRoot, FilterCondition, FilterGroup, DaySpec } from '$lib/types/filters';
import { createEmptyFilter } from '$lib/types/filters';
import type { ExplorePanel, ExploreState } from '$lib/types/explorePanels';
import { generatePanelId } from '$lib/types/explorePanels';

// Short keys for compact encoding
const CONDITION_TYPE_MAP: Record<string, string> = {
  'daily_luck': 'l',
  'night_event': 'n',
  'cart_item': 'c',
  'geode': 'g',
  'dish_of_day': 'd',
  'weather': 'w',
  'mine_floor': 'm',
};

const CONDITION_TYPE_REVERSE: Record<string, string> = Object.fromEntries(
  Object.entries(CONDITION_TYPE_MAP).map(([k, v]) => [v, k])
);

const DAY_SPEC_TYPE_MAP: Record<string, string> = {
  'exact': 'e',
  'range': 'r',
  'season': 's',
  'any': 'a',
};

const DAY_SPEC_TYPE_REVERSE: Record<string, string> = Object.fromEntries(
  Object.entries(DAY_SPEC_TYPE_MAP).map(([k, v]) => [v, k])
);

/**
 * Compress a DaySpec to a compact object
 */
function compressDaySpec(spec: DaySpec): unknown {
  const t = DAY_SPEC_TYPE_MAP[spec.type];
  switch (spec.type) {
    case 'exact':
      return { t, d: spec.day };
    case 'range':
      return { t, s: spec.start, e: spec.end };
    case 'season':
      return { t, s: spec.season, y: spec.year };
    case 'any':
      return { t };
  }
}

/**
 * Decompress a compact object back to DaySpec
 */
function decompressDaySpec(obj: Record<string, unknown>): DaySpec {
  const type = DAY_SPEC_TYPE_REVERSE[obj.t as string] as DaySpec['type'];
  switch (type) {
    case 'exact':
      return { type: 'exact', day: obj.d as number };
    case 'range':
      return { type: 'range', start: obj.s as number, end: obj.e as number };
    case 'season':
      return { type: 'season', season: obj.s as 0 | 1 | 2 | 3, year: obj.y as number };
    case 'any':
      return { type: 'any' };
    default:
      return { type: 'any' };
  }
}

/**
 * Compress a FilterCondition to a compact object
 */
function compressCondition(condition: FilterCondition): Record<string, unknown> {
  const base: Record<string, unknown> = { t: CONDITION_TYPE_MAP[condition.type] };

  switch (condition.type) {
    case 'daily_luck':
      base.ds = compressDaySpec(condition.daySpec);
      if (condition.minLuck !== undefined) base.mn = condition.minLuck;
      if (condition.maxLuck !== undefined) base.mx = condition.maxLuck;
      break;
    case 'night_event':
      base.ds = compressDaySpec(condition.daySpec);
      base.ev = condition.eventType;
      break;
    case 'cart_item':
      base.ds = compressDaySpec(condition.daySpec);
      base.i = condition.itemId;
      if (condition.maxPrice !== undefined) base.p = condition.maxPrice;
      break;
    case 'geode':
      base.n = condition.geodeNumber;
      base.gt = condition.geodeType;
      base.ti = condition.targetItems;
      break;
    case 'dish_of_day':
      base.ds = compressDaySpec(condition.daySpec);
      base.di = condition.dishId;
      break;
    case 'weather':
      base.ds = compressDaySpec(condition.daySpec);
      base.wt = condition.weatherType;
      break;
    case 'mine_floor':
      base.ds = compressDaySpec(condition.daySpec);
      base.fs = condition.floorRange.start;
      base.fe = condition.floorRange.end;
      if (condition.noMonsters) base.nm = 1;
      if (condition.noDark) base.nd = 1;
      if (condition.hasMushroom) base.hm = 1;
      break;
  }

  return base;
}

/**
 * Decompress a compact object back to FilterCondition
 */
function decompressCondition(obj: Record<string, unknown>): FilterCondition {
  const type = CONDITION_TYPE_REVERSE[obj.t as string] as FilterCondition['type'];

  switch (type) {
    case 'daily_luck':
      return {
        type: 'daily_luck',
        daySpec: decompressDaySpec(obj.ds as Record<string, unknown>),
        minLuck: obj.mn as number | undefined,
        maxLuck: obj.mx as number | undefined,
      };
    case 'night_event':
      return {
        type: 'night_event',
        daySpec: decompressDaySpec(obj.ds as Record<string, unknown>),
        eventType: obj.ev as 'fairy' | 'witch' | 'meteor' | 'ufo' | 'owl' | 'any',
      };
    case 'cart_item':
      return {
        type: 'cart_item',
        daySpec: decompressDaySpec(obj.ds as Record<string, unknown>),
        itemId: obj.i as number,
        maxPrice: obj.p as number | undefined,
      };
    case 'geode':
      return {
        type: 'geode',
        geodeNumber: obj.n as number,
        geodeType: obj.gt as 'geode' | 'frozen' | 'magma' | 'omni' | 'trove' | 'coconut',
        targetItems: obj.ti as number[],
      };
    case 'dish_of_day':
      return {
        type: 'dish_of_day',
        daySpec: decompressDaySpec(obj.ds as Record<string, unknown>),
        dishId: obj.di as number,
      };
    case 'weather':
      return {
        type: 'weather',
        daySpec: decompressDaySpec(obj.ds as Record<string, unknown>),
        weatherType: obj.wt as 'sunny' | 'rain' | 'storm' | 'windy' | 'snow' | 'any',
      };
    case 'mine_floor':
      return {
        type: 'mine_floor',
        daySpec: decompressDaySpec(obj.ds as Record<string, unknown>),
        floorRange: { start: obj.fs as number, end: obj.fe as number },
        noMonsters: obj.nm === 1,
        noDark: obj.nd === 1,
        hasMushroom: obj.hm === 1,
      };
    default:
      throw new Error(`Unknown condition type: ${type}`);
  }
}

/**
 * Compress a FilterGroup to a compact object
 */
function compressGroup(group: FilterGroup): Record<string, unknown> {
  return {
    l: group.logic === 'and' ? 'a' : 'o',
    c: group.conditions.map(item => {
      if ('logic' in item) {
        return { g: compressGroup(item) };
      } else {
        return compressCondition(item);
      }
    }),
  };
}

/**
 * Decompress a compact object back to FilterGroup
 */
function decompressGroup(obj: Record<string, unknown>, id?: string): FilterGroup {
  const conditions = (obj.c as Record<string, unknown>[]).map(item => {
    if ('g' in item) {
      return decompressGroup(item.g as Record<string, unknown>, crypto.randomUUID());
    } else {
      return decompressCondition(item);
    }
  });

  return {
    id: id || crypto.randomUUID(),
    logic: obj.l === 'a' ? 'and' : 'or',
    conditions,
  };
}

/**
 * Encode a filter to a URL-safe string
 */
export function encodeFilter(filter: FilterRoot): string {
  if (filter.conditions.length === 0) {
    return '';
  }

  const compressed = compressGroup(filter);
  const json = JSON.stringify(compressed);

  // Use base64url encoding (URL-safe base64)
  const encoded = btoa(json)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  return encoded;
}

/**
 * Decode a URL-safe string back to a filter
 */
export function decodeFilter(encoded: string): FilterRoot | null {
  if (!encoded) {
    return null;
  }

  try {
    // Restore base64 padding and characters
    let base64 = encoded
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    // Add padding if needed
    while (base64.length % 4) {
      base64 += '=';
    }

    const json = atob(base64);
    const compressed = JSON.parse(json);

    return decompressGroup(compressed);
  } catch (e) {
    console.error('Failed to decode filter:', e);
    return null;
  }
}

/**
 * Get the current filter from URL search params
 */
export function getFilterFromURL(): FilterRoot | null {
  if (typeof window === 'undefined') return null;

  const params = new URLSearchParams(window.location.search);
  const filterParam = params.get('f');

  if (!filterParam) return null;

  return decodeFilter(filterParam);
}

/**
 * Get a shareable URL for the current filter
 */
export function getShareableURL(filter: FilterRoot): string {
  if (typeof window === 'undefined') return '';

  const encoded = encodeFilter(filter);
  const url = new URL(window.location.origin + window.location.pathname);

  if (encoded) {
    url.searchParams.set('f', encoded);
  }

  return url.toString();
}

/**
 * Also support seed parameter in URL
 */
export function getSeedFromURL(): number | null {
  if (typeof window === 'undefined') return null;

  const params = new URLSearchParams(window.location.search);
  const seedParam = params.get('seed');

  if (!seedParam) return null;

  const seed = parseInt(seedParam, 10);
  return isNaN(seed) ? null : seed;
}

/**
 * Get version from URL
 */
export function getVersionFromURL(): '1.3' | '1.4' | '1.5' | '1.6' | null {
  if (typeof window === 'undefined') return null;

  const params = new URLSearchParams(window.location.search);
  const versionParam = params.get('v');

  if (!versionParam) return null;

  if (['1.3', '1.4', '1.5', '1.6'].includes(versionParam)) {
    return versionParam as '1.3' | '1.4' | '1.5' | '1.6';
  }
  return null;
}

// ============================================================================
// Explore State Serialization
// ============================================================================

// Panel type short codes
const PANEL_TYPE_MAP: Record<string, string> = {
  cart: 'c',
  night_events: 'n',
  daily_luck: 'l',
  weather: 'w',
  geodes: 'g',
  mine_floors: 'm',
  dish: 'd',
};

const PANEL_TYPE_REVERSE: Record<string, string> = Object.fromEntries(
  Object.entries(PANEL_TYPE_MAP).map(([k, v]) => [v, k])
);

// Geode type short codes
const GEODE_TYPE_MAP: Record<string, string> = {
  geode: 'r',
  frozen: 'f',
  magma: 'm',
  omni: 'o',
  trove: 't',
  coconut: 'c',
};

const GEODE_TYPE_REVERSE: Record<string, string> = Object.fromEntries(
  Object.entries(GEODE_TYPE_MAP).map(([k, v]) => [v, k])
);

/**
 * Compress an ExplorePanel to a compact object
 */
function compressPanel(panel: ExplorePanel): Record<string, unknown> {
  const base: Record<string, unknown> = { t: PANEL_TYPE_MAP[panel.type] };

  switch (panel.type) {
    case 'cart':
    case 'night_events':
    case 'daily_luck':
    case 'weather':
    case 'dish':
      base.ds = panel.dayRange.start;
      base.de = panel.dayRange.end;
      break;
    case 'geodes':
      base.gt = GEODE_TYPE_MAP[panel.geodeType];
      base.gs = panel.geodeRange.start;
      base.ge = panel.geodeRange.end;
      break;
    case 'mine_floors':
      base.d = panel.day;
      base.fs = panel.floorRange.start;
      base.fe = panel.floorRange.end;
      break;
  }

  return base;
}

/**
 * Decompress a compact object back to ExplorePanel
 */
function decompressPanel(obj: Record<string, unknown>): ExplorePanel {
  const type = PANEL_TYPE_REVERSE[obj.t as string] as ExplorePanel['type'];
  const id = generatePanelId();

  switch (type) {
    case 'cart':
      return {
        type: 'cart',
        id,
        dayRange: { start: obj.ds as number, end: obj.de as number },
      };
    case 'night_events':
      return {
        type: 'night_events',
        id,
        dayRange: { start: obj.ds as number, end: obj.de as number },
      };
    case 'daily_luck':
      return {
        type: 'daily_luck',
        id,
        dayRange: { start: obj.ds as number, end: obj.de as number },
      };
    case 'weather':
      return {
        type: 'weather',
        id,
        dayRange: { start: obj.ds as number, end: obj.de as number },
      };
    case 'dish':
      return {
        type: 'dish',
        id,
        dayRange: { start: obj.ds as number, end: obj.de as number },
      };
    case 'geodes':
      return {
        type: 'geodes',
        id,
        geodeType: GEODE_TYPE_REVERSE[obj.gt as string] as
          | 'geode'
          | 'frozen'
          | 'magma'
          | 'omni'
          | 'trove'
          | 'coconut',
        geodeRange: { start: obj.gs as number, end: obj.ge as number },
      };
    case 'mine_floors':
      return {
        type: 'mine_floors',
        id,
        day: obj.d as number,
        floorRange: { start: obj.fs as number, end: obj.fe as number },
      };
    default:
      throw new Error(`Unknown panel type: ${type}`);
  }
}

/**
 * Encode explore state to a URL-safe string
 */
export function encodeExploreState(state: ExploreState): string {
  if (state.panels.length === 0) {
    return '';
  }

  const compressed = {
    p: state.panels.map(compressPanel),
  };

  const json = JSON.stringify(compressed);

  // Use base64url encoding
  const encoded = btoa(json)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  return encoded;
}

/**
 * Decode a URL-safe string back to explore panels
 */
export function decodeExploreState(encoded: string): ExplorePanel[] | null {
  if (!encoded) {
    return null;
  }

  try {
    let base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');

    while (base64.length % 4) {
      base64 += '=';
    }

    const json = atob(base64);
    const compressed = JSON.parse(json);

    return (compressed.p as Record<string, unknown>[]).map(decompressPanel);
  } catch (e) {
    console.error('Failed to decode explore state:', e);
    return null;
  }
}

/**
 * Get explore panels from URL
 */
export function getExploreFromURL(): ExplorePanel[] | null {
  if (typeof window === 'undefined') return null;

  const params = new URLSearchParams(window.location.search);
  const exploreParam = params.get('e');

  if (!exploreParam) return null;

  return decodeExploreState(exploreParam);
}

/**
 * Get a shareable URL with filter, explore state, and seed
 */
export function getShareableExploreURL(
  filter: FilterRoot | null,
  panels: ExplorePanel[],
  seed: number
): string {
  if (typeof window === 'undefined') return '';

  const url = new URL(window.location.origin + window.location.pathname);

  // Add filter if present
  if (filter && filter.conditions.length > 0) {
    const filterEncoded = encodeFilter(filter);
    if (filterEncoded) {
      url.searchParams.set('f', filterEncoded);
    }
  }

  // Add explore state
  const state: ExploreState = { seed, panels };
  const exploreEncoded = encodeExploreState(state);
  if (exploreEncoded) {
    url.searchParams.set('e', exploreEncoded);
  }

  // Add seed
  url.searchParams.set('seed', seed.toString());

  return url.toString();
}

/**
 * Convert UI filter format to JSON for WASM search kernel.
 *
 * The WASM search_range() function expects a specific JSON format
 * that differs from the UI's filter representation.
 */

import type { FilterGroup, FilterCondition, DaySpec } from '$lib/types/filters';
import { getDaysFromSpec } from '$lib/utils/daySpec';

/**
 * Convert a UI filter to JSON string for WASM.
 */
export function filterToSearchJson(filter: FilterGroup): string {
  return JSON.stringify(convertGroup(filter));
}

/**
 * Convert a filter group to the WASM format.
 */
function convertGroup(group: FilterGroup): object {
  if (group.conditions.length === 0) {
    // Empty filter - matches everything
    return { logic: 'and', conditions: [] };
  }

  return {
    logic: group.logic,
    conditions: group.conditions.map((item) =>
      'logic' in item ? convertGroup(item) : convertCondition(item)
    ),
  };
}

/**
 * Convert a filter condition to the WASM format.
 */
function convertCondition(cond: FilterCondition): object {
  // Get day range from DaySpec
  const getDayRange = (spec: DaySpec): { day_start: number; day_end: number } => {
    const days = getDaysFromSpec(spec);
    if (days.length === 0) {
      return { day_start: 1, day_end: 1 };
    }
    return {
      day_start: Math.min(...days),
      day_end: Math.max(...days),
    };
  };

  switch (cond.type) {
    case 'daily_luck': {
      const { day_start, day_end } = getDayRange(cond.daySpec);
      return {
        logic: 'condition',
        type: 'daily_luck',
        day_start,
        day_end,
        min_luck: cond.minLuck ?? -1,
        max_luck: cond.maxLuck ?? 1,
      };
    }

    case 'cart_item': {
      const { day_start, day_end } = getDayRange(cond.daySpec);
      return {
        logic: 'condition',
        type: 'cart_item',
        day_start,
        day_end,
        item_id: cond.itemId,
        max_price: cond.maxPrice ?? null,
      };
    }

    case 'night_event': {
      const { day_start, day_end } = getDayRange(cond.daySpec);
      return {
        logic: 'condition',
        type: 'night_event',
        day_start,
        day_end,
        event_type: cond.eventType,
      };
    }

    case 'geode':
      return {
        logic: 'condition',
        type: 'geode',
        geode_number: cond.geodeNumber,
        geode_type: cond.geodeType,
        target_items: cond.targetItems,
      };

    case 'dish_of_day': {
      const { day_start, day_end } = getDayRange(cond.daySpec);
      return {
        logic: 'condition',
        type: 'dish_of_day',
        day_start,
        day_end,
        dish_id: cond.dishId,
      };
    }

    case 'weather': {
      const { day_start, day_end } = getDayRange(cond.daySpec);
      return {
        logic: 'condition',
        type: 'weather',
        day_start,
        day_end,
        weather_type: cond.weatherType,
      };
    }

    case 'mine_floor': {
      const { day_start, day_end } = getDayRange(cond.daySpec);
      return {
        logic: 'condition',
        type: 'mine_floor',
        day_start,
        day_end,
        floor_start: cond.floorRange.start,
        floor_end: cond.floorRange.end,
        no_monsters: cond.noMonsters ?? false,
        no_dark: cond.noDark ?? false,
        has_mushroom: cond.hasMushroom ?? false,
      };
    }
  }
}

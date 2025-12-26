/**
 * Converts filter conditions to explore panels
 *
 * When a user searches for seeds with certain criteria, we auto-generate
 * explore panels based on what they searched for. For example:
 * - Cart item in Spring Y1 → Cart panel for days 1-28
 * - Night event days 20-25 → Night events panel for days 20-25
 */

import type { FilterRoot, FilterCondition, FilterGroup, DaySpec } from '$lib/types/filters';
import {
  type ExplorePanel,
  type DayRange,
  createCartPanel,
  createNightEventsPanel,
  createDailyLuckPanel,
  createWeatherPanel,
  createGeodesPanel,
  createMineFloorsPanel,
  createDishPanel,
} from '$lib/types/explorePanels';

// ============================================================================
// DaySpec → DayRange Conversion
// ============================================================================

/**
 * Convert a DaySpec to a DayRange for panel display
 */
export function daySpecToRange(spec: DaySpec): DayRange {
  switch (spec.type) {
    case 'exact':
      return { start: spec.day, end: spec.day };
    case 'range':
      return { start: spec.start, end: spec.end };
    case 'season': {
      const year = spec.year ?? 1;
      const seasonStart = spec.season * 28 + 1 + (year - 1) * 112;
      return { start: seasonStart, end: seasonStart + 27 };
    }
    case 'any':
      // Default to first season for 'any' - reasonable starting view
      return { start: 1, end: 28 };
  }
}

// ============================================================================
// Flatten Filter Tree
// ============================================================================

/**
 * Extract all conditions from a filter tree, flattening groups
 */
export function flattenConditions(
  node: FilterCondition | FilterGroup
): FilterCondition[] {
  if ('conditions' in node) {
    // It's a FilterGroup
    return node.conditions.flatMap(flattenConditions);
  }
  // It's a FilterCondition
  return [node];
}

// ============================================================================
// Merge Day Ranges
// ============================================================================

/**
 * Merge overlapping or adjacent day ranges
 * Only merges ranges that actually overlap or are adjacent (within 1 day)
 * Non-overlapping ranges are kept separate, returning the union bounds
 */
function mergeRanges(ranges: DayRange[]): DayRange {
  if (ranges.length === 0) {
    return { start: 1, end: 28 };
  }

  if (ranges.length === 1) {
    return ranges[0];
  }

  const sorted = [...ranges].sort((a, b) => a.start - b.start);
  let merged = sorted[0];

  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i];
    // Only extend if overlapping or adjacent (within 1 day)
    if (current.start <= merged.end + 1) {
      merged = {
        start: merged.start,
        end: Math.max(merged.end, current.end),
      };
    }
    // If there's a gap, don't extend - keep the existing merged range
    // This means we prioritize the first/earliest range when there are gaps
  }

  return merged;
}

// ============================================================================
// Main Conversion Function
// ============================================================================

/**
 * Convert a filter to explore panels
 *
 * Creates one panel per unique condition type, with ranges merged
 * from all conditions of that type.
 */
export function filterToPanels(filter: FilterRoot): ExplorePanel[] {
  const conditions = flattenConditions(filter);

  if (conditions.length === 0) {
    return [];
  }

  // Group conditions by type and collect their ranges
  const cartRanges: DayRange[] = [];
  const nightEventRanges: DayRange[] = [];
  const luckRanges: DayRange[] = [];
  const weatherRanges: DayRange[] = [];
  const dishRanges: DayRange[] = [];
  const geodeConditions: Array<{
    geodeType: 'geode' | 'frozen' | 'magma' | 'omni' | 'trove' | 'coconut';
    number: number;
  }> = [];
  const mineConditions: Array<{
    daySpec: DaySpec;
    floorRange: { start: number; end: number };
  }> = [];

  for (const condition of conditions) {
    switch (condition.type) {
      case 'cart_item':
        cartRanges.push(daySpecToRange(condition.daySpec));
        break;
      case 'night_event':
        nightEventRanges.push(daySpecToRange(condition.daySpec));
        break;
      case 'daily_luck':
        luckRanges.push(daySpecToRange(condition.daySpec));
        break;
      case 'weather':
        weatherRanges.push(daySpecToRange(condition.daySpec));
        break;
      case 'dish_of_day':
        dishRanges.push(daySpecToRange(condition.daySpec));
        break;
      case 'geode':
        geodeConditions.push({
          geodeType: condition.geodeType,
          number: condition.geodeNumber,
        });
        break;
      case 'mine_floor':
        mineConditions.push({
          daySpec: condition.daySpec,
          floorRange: condition.floorRange,
        });
        break;
    }
  }

  const panels: ExplorePanel[] = [];

  // Create panels for day-based conditions
  if (cartRanges.length > 0) {
    panels.push(createCartPanel(mergeRanges(cartRanges)));
  }

  if (nightEventRanges.length > 0) {
    panels.push(createNightEventsPanel(mergeRanges(nightEventRanges)));
  }

  if (luckRanges.length > 0) {
    panels.push(createDailyLuckPanel(mergeRanges(luckRanges)));
  }

  if (weatherRanges.length > 0) {
    panels.push(createWeatherPanel(mergeRanges(weatherRanges)));
  }

  if (dishRanges.length > 0) {
    panels.push(createDishPanel(mergeRanges(dishRanges)));
  }

  // Create geode panels - group by type
  const geodesByType = new Map<string, number[]>();
  for (const g of geodeConditions) {
    const existing = geodesByType.get(g.geodeType) ?? [];
    existing.push(g.number);
    geodesByType.set(g.geodeType, existing);
  }

  for (const [geodeType, numbers] of geodesByType) {
    const min = Math.min(...numbers);
    const max = Math.max(...numbers);
    panels.push(
      createGeodesPanel(
        geodeType as 'geode' | 'frozen' | 'magma' | 'omni' | 'trove' | 'coconut',
        { start: min, end: max }
      )
    );
  }

  // Create mine panels - use first day found
  if (mineConditions.length > 0) {
    const firstMine = mineConditions[0];
    const dayRange = daySpecToRange(firstMine.daySpec);
    // Use first day of range for mine exploration
    const allFloorRanges = mineConditions.map((m) => m.floorRange);
    const mergedFloors = {
      start: Math.min(...allFloorRanges.map((f) => f.start)),
      end: Math.max(...allFloorRanges.map((f) => f.end)),
    };
    panels.push(createMineFloorsPanel(dayRange.start, mergedFloors));
  }

  return panels;
}

// ============================================================================
// Panel Type Helpers
// ============================================================================

export type PanelType = ExplorePanel['type'];

export const ALL_PANEL_TYPES: PanelType[] = [
  'daily_luck',
  'weather',
  'night_events',
  'cart',
  'dish',
  'geodes',
  'mine_floors',
];

export function getPanelTypeLabel(type: PanelType): string {
  switch (type) {
    case 'cart':
      return 'Traveling Cart';
    case 'night_events':
      return 'Night Events';
    case 'daily_luck':
      return 'Daily Luck';
    case 'weather':
      return 'Weather';
    case 'geodes':
      return 'Geodes';
    case 'mine_floors':
      return 'Mine Floors';
    case 'dish':
      return 'Dish of the Day';
  }
}

/**
 * Create a default panel for a given type
 */
export function createDefaultPanel(type: PanelType): ExplorePanel {
  switch (type) {
    case 'cart':
      return createCartPanel();
    case 'night_events':
      return createNightEventsPanel();
    case 'daily_luck':
      return createDailyLuckPanel();
    case 'weather':
      return createWeatherPanel();
    case 'geodes':
      return createGeodesPanel();
    case 'mine_floors':
      return createMineFloorsPanel();
    case 'dish':
      return createDishPanel();
  }
}

/**
 * Converts filter conditions to explore panels
 *
 * When a user searches for seeds with certain criteria, we auto-generate
 * explore panels based on what they searched for. For example:
 * - Cart item in Spring Y1 → Cart panel for days 1-28
 * - Night event days 20-25 → Night events panel for days 20-25
 */

import type { FilterRoot, FilterCondition, FilterGroup, DaySpec } from '$lib/types/filters';
import { getDaysFromSpec } from '$lib/types/filters';
import {
  type ExplorePanel,
  type DayRange,
  type CartPanel,
  type NightEventsPanel,
  type DailyLuckPanel,
  type WeatherPanel,
  type GeodesPanel,
  type MineFloorsPanel,
  type DishPanel,
  type CartHighlight,
  type NightEventHighlight,
  type LuckHighlight,
  type WeatherHighlight,
  type GeodeHighlight,
  type MineFloorHighlight,
  type DishHighlight,
  generatePanelId,
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
 * Merge overlapping or adjacent day ranges into groups
 * Returns an array of merged ranges - one for each non-overlapping group
 */
function mergeRanges(ranges: DayRange[]): DayRange[] {
  if (ranges.length === 0) {
    return [{ start: 1, end: 28 }];
  }

  if (ranges.length === 1) {
    return [ranges[0]];
  }

  const sorted = [...ranges].sort((a, b) => a.start - b.start);
  const result: DayRange[] = [];
  let current = sorted[0];

  for (let i = 1; i < sorted.length; i++) {
    const next = sorted[i];
    // Merge if overlapping or adjacent (within 1 day)
    if (next.start <= current.end + 1) {
      current = {
        start: current.start,
        end: Math.max(current.end, next.end),
      };
    } else {
      // Gap found - save current group and start a new one
      result.push(current);
      current = next;
    }
  }
  // Don't forget the last group
  result.push(current);

  return result;
}

// ============================================================================
// Highlight Criteria Extraction
// ============================================================================

/** Extract cart item highlights from conditions */
function extractCartHighlights(conditions: FilterCondition[]): CartHighlight[] {
  return conditions
    .filter((c): c is FilterCondition & { type: 'cart_item' } => c.type === 'cart_item')
    .map((c) => ({
      itemId: c.itemId,
      maxPrice: c.maxPrice,
      days: getDaysFromSpec(c.daySpec),
    }));
}

/** Extract night event highlights from conditions */
function extractNightEventHighlights(conditions: FilterCondition[]): NightEventHighlight[] {
  return conditions
    .filter((c): c is FilterCondition & { type: 'night_event' } => c.type === 'night_event')
    .map((c) => ({
      eventType: c.eventType,
      days: getDaysFromSpec(c.daySpec),
    }));
}

/** Extract luck highlights from conditions */
function extractLuckHighlights(conditions: FilterCondition[]): LuckHighlight[] {
  return conditions
    .filter((c): c is FilterCondition & { type: 'daily_luck' } => c.type === 'daily_luck')
    .map((c) => ({
      minLuck: c.minLuck,
      maxLuck: c.maxLuck,
      days: getDaysFromSpec(c.daySpec),
    }));
}

/** Extract weather highlights from conditions */
function extractWeatherHighlights(conditions: FilterCondition[]): WeatherHighlight[] {
  return conditions
    .filter((c): c is FilterCondition & { type: 'weather' } => c.type === 'weather')
    .map((c) => ({
      weatherType: c.weatherType,
      days: getDaysFromSpec(c.daySpec),
    }));
}

/** Extract geode highlights from conditions for a specific geode type */
function extractGeodeHighlights(
  conditions: FilterCondition[],
  geodeType: string
): GeodeHighlight[] {
  const geodeConditions = conditions.filter(
    (c): c is FilterCondition & { type: 'geode' } =>
      c.type === 'geode' && c.geodeType === geodeType
  );

  if (geodeConditions.length === 0) return [];

  // Collect all geode numbers and target items for this type
  const geodeNumbers: number[] = [];
  const targetItems: number[] = [];

  for (const c of geodeConditions) {
    if (!geodeNumbers.includes(c.geodeNumber)) {
      geodeNumbers.push(c.geodeNumber);
    }
    for (const item of c.targetItems) {
      if (!targetItems.includes(item)) {
        targetItems.push(item);
      }
    }
  }

  return [{ geodeNumbers, targetItems }];
}

/** Extract mine floor highlights from conditions */
function extractMineFloorHighlights(conditions: FilterCondition[]): MineFloorHighlight[] {
  const mineConditions = conditions.filter(
    (c): c is FilterCondition & { type: 'mine_floor' } => c.type === 'mine_floor'
  );

  if (mineConditions.length === 0) return [];

  // Collect floors that should be highlighted (mushroom floors when hasMushroom is set)
  const highlights: MineFloorHighlight[] = [];

  for (const c of mineConditions) {
    if (c.hasMushroom) {
      // Highlight floors in the filter's floor range that have mushrooms
      const floors: number[] = [];
      for (let f = c.floorRange.start; f <= c.floorRange.end; f++) {
        floors.push(f);
      }
      highlights.push({ floors, hasMushroom: true });
    }
  }

  return highlights;
}

/** Extract dish highlights from conditions */
function extractDishHighlights(conditions: FilterCondition[]): DishHighlight[] {
  return conditions
    .filter((c): c is FilterCondition & { type: 'dish_of_day' } => c.type === 'dish_of_day')
    .map((c) => ({
      dishId: c.dishId,
      days: getDaysFromSpec(c.daySpec),
    }));
}

// ============================================================================
// Main Conversion Function
// ============================================================================

/**
 * Convert a filter to explore panels
 *
 * Creates one panel per unique condition type, with ranges merged
 * from all conditions of that type. Also attaches highlight criteria
 * so panels can visually emphasize matched items.
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
    hasMushroom?: boolean;
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
          hasMushroom: condition.hasMushroom,
        });
        break;
    }
  }

  const panels: ExplorePanel[] = [];

  // Extract highlight criteria
  const cartHighlights = extractCartHighlights(conditions);
  const nightEventHighlights = extractNightEventHighlights(conditions);
  const luckHighlights = extractLuckHighlights(conditions);
  const weatherHighlights = extractWeatherHighlights(conditions);
  const dishHighlights = extractDishHighlights(conditions);
  const mineFloorHighlights = extractMineFloorHighlights(conditions);

  // Create panels for day-based conditions
  // Each non-overlapping range group gets its own panel
  if (cartRanges.length > 0) {
    for (const range of mergeRanges(cartRanges)) {
      const panel: CartPanel = {
        type: 'cart',
        id: generatePanelId(),
        dayRange: range,
        highlights: cartHighlights.length > 0 ? cartHighlights : undefined,
      };
      panels.push(panel);
    }
  }

  if (nightEventRanges.length > 0) {
    for (const range of mergeRanges(nightEventRanges)) {
      const panel: NightEventsPanel = {
        type: 'night_events',
        id: generatePanelId(),
        dayRange: range,
        highlights: nightEventHighlights.length > 0 ? nightEventHighlights : undefined,
      };
      panels.push(panel);
    }
  }

  if (luckRanges.length > 0) {
    for (const range of mergeRanges(luckRanges)) {
      const panel: DailyLuckPanel = {
        type: 'daily_luck',
        id: generatePanelId(),
        dayRange: range,
        highlights: luckHighlights.length > 0 ? luckHighlights : undefined,
      };
      panels.push(panel);
    }
  }

  if (weatherRanges.length > 0) {
    for (const range of mergeRanges(weatherRanges)) {
      const panel: WeatherPanel = {
        type: 'weather',
        id: generatePanelId(),
        dayRange: range,
        highlights: weatherHighlights.length > 0 ? weatherHighlights : undefined,
      };
      panels.push(panel);
    }
  }

  if (dishRanges.length > 0) {
    for (const range of mergeRanges(dishRanges)) {
      const panel: DishPanel = {
        type: 'dish',
        id: generatePanelId(),
        dayRange: range,
        highlights: dishHighlights.length > 0 ? dishHighlights : undefined,
      };
      panels.push(panel);
    }
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
    const geodeHighlights = extractGeodeHighlights(conditions, geodeType);
    const panel: GeodesPanel = {
      type: 'geodes',
      id: generatePanelId(),
      geodeType: geodeType as 'geode' | 'frozen' | 'magma' | 'omni' | 'trove' | 'coconut',
      geodeRange: { start: min, end: max },
      highlights: geodeHighlights.length > 0 ? geodeHighlights : undefined,
    };
    panels.push(panel);
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
    const panel: MineFloorsPanel = {
      type: 'mine_floors',
      id: generatePanelId(),
      day: dayRange.start,
      floorRange: mergedFloors,
      highlights: mineFloorHighlights.length > 0 ? mineFloorHighlights : undefined,
    };
    panels.push(panel);
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

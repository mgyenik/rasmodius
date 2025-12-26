/**
 * Filter types for Stardew Valley seed searching
 */

// ============================================================================
// Day Specification (Flexible Ranges)
// ============================================================================

export type DaySpec =
  | { type: 'exact'; day: number }
  | { type: 'range'; start: number; end: number }
  | { type: 'season'; season: 0 | 1 | 2 | 3; year?: number } // 0=Spring, 1=Summer, 2=Fall, 3=Winter
  | { type: 'any' }; // Any day

export function getDaysFromSpec(spec: DaySpec, maxDay: number = 224): number[] {
  switch (spec.type) {
    case 'exact':
      return [spec.day];
    case 'range':
      return Array.from({ length: spec.end - spec.start + 1 }, (_, i) => spec.start + i);
    case 'season': {
      const seasonStart = spec.season * 28 + 1 + ((spec.year ?? 1) - 1) * 112;
      return Array.from({ length: 28 }, (_, i) => seasonStart + i).filter(d => d <= maxDay);
    }
    case 'any':
      return Array.from({ length: maxDay }, (_, i) => i + 1);
  }
}

// ============================================================================
// Filter Conditions
// ============================================================================

export type LuckCondition = {
  type: 'daily_luck';
  daySpec: DaySpec;
  minLuck?: number; // -0.1 to 0.1
  maxLuck?: number;
};

export type NightEventCondition = {
  type: 'night_event';
  daySpec: DaySpec;
  eventType: 'fairy' | 'witch' | 'meteor' | 'ufo' | 'owl' | 'any';
};

export type CartItemCondition = {
  type: 'cart_item';
  daySpec: DaySpec;
  itemId: number;
  maxPrice?: number;
};

export type GeodeCondition = {
  type: 'geode';
  geodeNumber: number; // 1-indexed
  geodeType: 'geode' | 'frozen' | 'magma' | 'omni' | 'trove' | 'coconut';
  targetItems: number[]; // Any of these items
};

export type DishCondition = {
  type: 'dish_of_day';
  daySpec: DaySpec;
  dishId: number;
};

export type WeatherCondition = {
  type: 'weather';
  daySpec: DaySpec;
  weatherType: 'sunny' | 'rain' | 'storm' | 'windy' | 'snow' | 'any';
};

export type MineFloorCondition = {
  type: 'mine_floor';
  daySpec: DaySpec;
  floorRange: { start: number; end: number };
  noMonsters?: boolean; // Exclude seeds with monster floors in range
  noDark?: boolean; // Exclude seeds with dark floors in range
  hasMushroom?: boolean; // Require mushroom floor in range (floors 81+)
};

export type FilterCondition =
  | LuckCondition
  | NightEventCondition
  | CartItemCondition
  | GeodeCondition
  | DishCondition
  | WeatherCondition
  | MineFloorCondition;

// ============================================================================
// Filter Groups (AND/OR logic)
// ============================================================================

export type FilterGroup = {
  id: string;
  logic: 'and' | 'or';
  conditions: (FilterCondition | FilterGroup)[];
};

export type FilterRoot = FilterGroup;

// ============================================================================
// Filter Examples
// ============================================================================

export const FILTER_EXAMPLES: { name: string; description: string; filter: FilterRoot }[] = [
  {
    name: 'Early Red Cabbage',
    description: 'Find seeds with Red Cabbage in cart during Spring Year 1',
    filter: {
      id: 'preset-red-cabbage',
      logic: 'and',
      conditions: [
        {
          type: 'cart_item',
          daySpec: { type: 'season', season: 0, year: 1 },
          itemId: 266, // Red Cabbage
        },
      ],
    },
  },
  {
    name: 'Lucky Day 1',
    description: 'Seeds with very good luck on day 1',
    filter: {
      id: 'preset-lucky-day1',
      logic: 'and',
      conditions: [
        {
          type: 'daily_luck',
          daySpec: { type: 'exact', day: 1 },
          minLuck: 0.07,
        },
      ],
    },
  },
  {
    name: 'Early Fairy',
    description: 'Crop fairy event in first week',
    filter: {
      id: 'preset-early-fairy',
      logic: 'and',
      conditions: [
        {
          type: 'night_event',
          daySpec: { type: 'range', start: 1, end: 7 },
          eventType: 'fairy',
        },
      ],
    },
  },
  {
    name: 'Prismatic Shard Geode',
    description: 'Prismatic Shard in first 20 Omni Geodes',
    filter: {
      id: 'preset-prismatic',
      logic: 'or',
      conditions: Array.from({ length: 20 }, (_, i) => ({
        type: 'geode' as const,
        geodeNumber: i + 1,
        geodeType: 'omni' as const,
        targetItems: [74], // Prismatic Shard
      })),
    },
  },
  {
    name: 'Early Rain',
    description: 'Rain on Day 3 (for fishing/crops)',
    filter: {
      id: 'preset-early-rain',
      logic: 'and',
      conditions: [
        {
          type: 'weather',
          daySpec: { type: 'exact', day: 3 },
          weatherType: 'rain',
        },
      ],
    },
  },
  {
    name: 'Safe Mine Rush',
    description: 'No monster/dark floors in first 50 floors on day 5',
    filter: {
      id: 'preset-safe-mines',
      logic: 'and',
      conditions: [
        {
          type: 'mine_floor',
          daySpec: { type: 'exact', day: 5 },
          floorRange: { start: 1, end: 50 },
          noMonsters: true,
          noDark: true,
        },
      ],
    },
  },
];

// ============================================================================
// Helper Functions
// ============================================================================

export function createEmptyFilter(): FilterRoot {
  return {
    id: crypto.randomUUID(),
    logic: 'and',
    conditions: [],
  };
}

export function generateId(): string {
  return crypto.randomUUID();
}

export function getConditionLabel(condition: FilterCondition): string {
  switch (condition.type) {
    case 'daily_luck':
      return 'Daily Luck';
    case 'night_event':
      return 'Night Event';
    case 'cart_item':
      return 'Cart Item';
    case 'geode':
      return 'Geode Contents';
    case 'dish_of_day':
      return 'Dish of the Day';
    case 'weather':
      return 'Weather';
    case 'mine_floor':
      return 'Mine Floors';
  }
}

export function getDaySpecLabel(spec: DaySpec): string {
  switch (spec.type) {
    case 'exact':
      return `Day ${spec.day}`;
    case 'range':
      return `Days ${spec.start}-${spec.end}`;
    case 'season': {
      const seasons = ['Spring', 'Summer', 'Fall', 'Winter'];
      const year = spec.year ? ` Y${spec.year}` : '';
      return `${seasons[spec.season]}${year}`;
    }
    case 'any':
      return 'Any day';
  }
}

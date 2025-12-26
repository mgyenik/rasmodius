/**
 * Explore panel types for displaying seed data
 *
 * These are display-focused types (vs FilterCondition which is search-focused).
 * Panels show data for a seed, while filters find seeds matching criteria.
 */

// ============================================================================
// Range Types
// ============================================================================

export type DayRange = {
  start: number;
  end: number;
};

export type GeodeRange = {
  start: number; // 1-indexed geode number
  end: number;
};

export type FloorRange = {
  start: number;
  end: number;
};

// ============================================================================
// Panel Types (Discriminated Union)
// ============================================================================

export type CartPanel = {
  type: 'cart';
  id: string;
  dayRange: DayRange;
};

export type NightEventsPanel = {
  type: 'night_events';
  id: string;
  dayRange: DayRange;
};

export type DailyLuckPanel = {
  type: 'daily_luck';
  id: string;
  dayRange: DayRange;
};

export type WeatherPanel = {
  type: 'weather';
  id: string;
  dayRange: DayRange;
};

export type GeodesPanel = {
  type: 'geodes';
  id: string;
  geodeType: 'geode' | 'frozen' | 'magma' | 'omni' | 'trove' | 'coconut';
  geodeRange: GeodeRange;
};

export type MineFloorsPanel = {
  type: 'mine_floors';
  id: string;
  day: number;
  floorRange: FloorRange;
};

export type DishPanel = {
  type: 'dish';
  id: string;
  dayRange: DayRange;
};

export type ExplorePanel =
  | CartPanel
  | NightEventsPanel
  | DailyLuckPanel
  | WeatherPanel
  | GeodesPanel
  | MineFloorsPanel
  | DishPanel;

// ============================================================================
// Explore State
// ============================================================================

export type ExploreState = {
  seed: number;
  panels: ExplorePanel[];
};

// ============================================================================
// Helper Functions
// ============================================================================

export function generatePanelId(): string {
  return crypto.randomUUID();
}

export function getPanelLabel(panel: ExplorePanel): string {
  switch (panel.type) {
    case 'cart':
      return 'Traveling Cart';
    case 'night_events':
      return 'Night Events';
    case 'daily_luck':
      return 'Daily Luck';
    case 'weather':
      return 'Weather';
    case 'geodes':
      return `${capitalizeGeodeType(panel.geodeType)} Geodes`;
    case 'mine_floors':
      return 'Mine Floors';
    case 'dish':
      return 'Dish of the Day';
  }
}

export function getPanelRangeLabel(panel: ExplorePanel): string {
  switch (panel.type) {
    case 'cart':
    case 'night_events':
    case 'daily_luck':
    case 'weather':
    case 'dish':
      return `Days ${panel.dayRange.start}-${panel.dayRange.end}`;
    case 'geodes':
      return `#${panel.geodeRange.start}-${panel.geodeRange.end}`;
    case 'mine_floors':
      return `Day ${panel.day}, Floors ${panel.floorRange.start}-${panel.floorRange.end}`;
  }
}

function capitalizeGeodeType(
  type: 'geode' | 'frozen' | 'magma' | 'omni' | 'trove' | 'coconut'
): string {
  switch (type) {
    case 'geode':
      return 'Regular';
    case 'frozen':
      return 'Frozen';
    case 'magma':
      return 'Magma';
    case 'omni':
      return 'Omni';
    case 'trove':
      return 'Artifact Trove';
    case 'coconut':
      return 'Golden Coconut';
  }
}

// ============================================================================
// Default Panel Factories
// ============================================================================

export function createCartPanel(dayRange?: DayRange): CartPanel {
  return {
    type: 'cart',
    id: generatePanelId(),
    dayRange: dayRange ?? { start: 1, end: 28 },
  };
}

export function createNightEventsPanel(dayRange?: DayRange): NightEventsPanel {
  return {
    type: 'night_events',
    id: generatePanelId(),
    dayRange: dayRange ?? { start: 1, end: 28 },
  };
}

export function createDailyLuckPanel(dayRange?: DayRange): DailyLuckPanel {
  return {
    type: 'daily_luck',
    id: generatePanelId(),
    dayRange: dayRange ?? { start: 1, end: 14 },
  };
}

export function createWeatherPanel(dayRange?: DayRange): WeatherPanel {
  return {
    type: 'weather',
    id: generatePanelId(),
    dayRange: dayRange ?? { start: 1, end: 28 },
  };
}

export function createGeodesPanel(
  geodeType: GeodesPanel['geodeType'] = 'omni',
  geodeRange?: GeodeRange
): GeodesPanel {
  return {
    type: 'geodes',
    id: generatePanelId(),
    geodeType,
    geodeRange: geodeRange ?? { start: 1, end: 10 },
  };
}

export function createMineFloorsPanel(
  day: number = 5,
  floorRange?: FloorRange
): MineFloorsPanel {
  return {
    type: 'mine_floors',
    id: generatePanelId(),
    day,
    floorRange: floorRange ?? { start: 1, end: 120 },
  };
}

export function createDishPanel(dayRange?: DayRange): DishPanel {
  return {
    type: 'dish',
    id: generatePanelId(),
    dayRange: dayRange ?? { start: 1, end: 28 },
  };
}

// ============================================================================
// Default Explore State
// ============================================================================

export function createDefaultExploreState(seed: number = 1): ExploreState {
  return {
    seed,
    panels: [
      createDailyLuckPanel({ start: 1, end: 14 }),
      createWeatherPanel({ start: 1, end: 28 }),
      createNightEventsPanel({ start: 1, end: 28 }),
      createCartPanel({ start: 1, end: 28 }),
    ],
  };
}

import { describe, it, expect } from 'vitest';
import {
  filterToPanels,
  daySpecToRange,
  flattenConditions,
} from '$lib/utils/filterToPanels';
import type { FilterRoot, FilterCondition, FilterGroup } from '$lib/types/filters';

describe('filterToPanels', () => {
  describe('daySpecToRange', () => {
    it('converts exact day to single-day range', () => {
      const result = daySpecToRange({ type: 'exact', day: 15 });
      expect(result).toEqual({ start: 15, end: 15 });
    });

    it('converts range spec directly', () => {
      const result = daySpecToRange({ type: 'range', start: 10, end: 20 });
      expect(result).toEqual({ start: 10, end: 20 });
    });

    it('converts Spring Y1 season', () => {
      const result = daySpecToRange({ type: 'season', season: 0, year: 1 });
      expect(result).toEqual({ start: 1, end: 28 });
    });

    it('converts Summer Y1 season', () => {
      const result = daySpecToRange({ type: 'season', season: 1, year: 1 });
      expect(result).toEqual({ start: 29, end: 56 });
    });

    it('converts Winter Y2 season', () => {
      const result = daySpecToRange({ type: 'season', season: 3, year: 2 });
      // Winter Y2: 3*28 + 1 + (2-1)*112 = 85 + 112 = 197
      expect(result).toEqual({ start: 197, end: 224 });
    });

    it('defaults year to 1 for season', () => {
      const result = daySpecToRange({ type: 'season', season: 0 });
      expect(result).toEqual({ start: 1, end: 28 });
    });

    it('converts season with year 2 correctly', () => {
      const result = daySpecToRange({ type: 'season', season: 1, year: 2 });
      expect(result).toEqual({ start: 141, end: 168 }); // Summer Y2
    });
  });

  describe('flattenConditions', () => {
    it('returns single condition as array', () => {
      const condition: FilterCondition = {
        type: 'daily_luck',
        daySpec: { type: 'exact', day: 1 },
        minLuck: 0.05,
      };
      const result = flattenConditions(condition);
      expect(result).toHaveLength(1);
      expect(result[0]).toBe(condition);
    });

    it('flattens simple group', () => {
      const group: FilterGroup = {
        id: 'test',
        logic: 'and',
        conditions: [
          { type: 'daily_luck', daySpec: { type: 'exact', day: 1 } },
          { type: 'cart_item', daySpec: { type: 'exact', day: 5 }, itemId: 266 },
        ],
      };
      const result = flattenConditions(group);
      expect(result).toHaveLength(2);
      expect(result[0].type).toBe('daily_luck');
      expect(result[1].type).toBe('cart_item');
    });

    it('flattens nested groups', () => {
      const group: FilterGroup = {
        id: 'outer',
        logic: 'and',
        conditions: [
          { type: 'daily_luck', daySpec: { type: 'exact', day: 1 } },
          {
            id: 'inner',
            logic: 'or',
            conditions: [
              { type: 'cart_item', daySpec: { type: 'exact', day: 5 }, itemId: 266 },
              { type: 'cart_item', daySpec: { type: 'exact', day: 12 }, itemId: 270 },
            ],
          },
        ],
      };
      const result = flattenConditions(group);
      expect(result).toHaveLength(3);
      expect(result[0].type).toBe('daily_luck');
      expect(result[1].type).toBe('cart_item');
      expect(result[2].type).toBe('cart_item');
    });

    it('handles deeply nested groups', () => {
      const group: FilterGroup = {
        id: 'level1',
        logic: 'and',
        conditions: [
          {
            id: 'level2',
            logic: 'or',
            conditions: [
              {
                id: 'level3',
                logic: 'and',
                conditions: [{ type: 'daily_luck', daySpec: { type: 'exact', day: 1 } }],
              },
            ],
          },
        ],
      };
      const result = flattenConditions(group);
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('daily_luck');
    });

    it('handles empty group', () => {
      const group: FilterGroup = {
        id: 'empty',
        logic: 'and',
        conditions: [],
      };
      const result = flattenConditions(group);
      expect(result).toHaveLength(0);
    });
  });

  describe('mergeRanges (via filterToPanels)', () => {
    it('merges overlapping ranges', () => {
      const filter: FilterRoot = {
        id: 'test',
        logic: 'and',
        conditions: [
          { type: 'daily_luck', daySpec: { type: 'range', start: 1, end: 15 } },
          { type: 'daily_luck', daySpec: { type: 'range', start: 10, end: 25 } },
        ],
      };
      const panels = filterToPanels(filter);

      expect(panels).toHaveLength(1);
      expect(panels[0].type).toBe('daily_luck');
      if (panels[0].type === 'daily_luck') {
        expect(panels[0].dayRange).toEqual({ start: 1, end: 25 });
      }
    });

    it('merges adjacent ranges (gap of 1)', () => {
      const filter: FilterRoot = {
        id: 'test',
        logic: 'and',
        conditions: [
          { type: 'daily_luck', daySpec: { type: 'range', start: 1, end: 10 } },
          { type: 'daily_luck', daySpec: { type: 'range', start: 11, end: 20 } },
        ],
      };
      const panels = filterToPanels(filter);

      expect(panels).toHaveLength(1);
      if (panels[0].type === 'daily_luck') {
        expect(panels[0].dayRange).toEqual({ start: 1, end: 20 });
      }
    });

    it('keeps non-overlapping ranges separate', () => {
      const filter: FilterRoot = {
        id: 'test',
        logic: 'and',
        conditions: [
          { type: 'daily_luck', daySpec: { type: 'range', start: 1, end: 10 } },
          { type: 'daily_luck', daySpec: { type: 'range', start: 15, end: 25 } },
        ],
      };
      const panels = filterToPanels(filter);

      expect(panels).toHaveLength(2);
      expect(panels[0].type).toBe('daily_luck');
      expect(panels[1].type).toBe('daily_luck');
      if (panels[0].type === 'daily_luck' && panels[1].type === 'daily_luck') {
        expect(panels[0].dayRange).toEqual({ start: 1, end: 10 });
        expect(panels[1].dayRange).toEqual({ start: 15, end: 25 });
      }
    });

    it('sorts ranges before merging', () => {
      const filter: FilterRoot = {
        id: 'test',
        logic: 'and',
        conditions: [
          { type: 'daily_luck', daySpec: { type: 'range', start: 20, end: 30 } },
          { type: 'daily_luck', daySpec: { type: 'range', start: 1, end: 15 } },
          { type: 'daily_luck', daySpec: { type: 'range', start: 10, end: 25 } },
        ],
      };
      const panels = filterToPanels(filter);

      expect(panels).toHaveLength(1);
      if (panels[0].type === 'daily_luck') {
        expect(panels[0].dayRange).toEqual({ start: 1, end: 30 });
      }
    });
  });

  describe('filterToPanels - panel creation', () => {
    it('returns empty array for empty filter', () => {
      const filter: FilterRoot = {
        id: 'test',
        logic: 'and',
        conditions: [],
      };
      const panels = filterToPanels(filter);
      expect(panels).toHaveLength(0);
    });

    it('creates cart panel from cart_item condition', () => {
      const filter: FilterRoot = {
        id: 'test',
        logic: 'and',
        conditions: [
          { type: 'cart_item', daySpec: { type: 'season', season: 0, year: 1 }, itemId: 266 },
        ],
      };
      const panels = filterToPanels(filter);

      expect(panels).toHaveLength(1);
      expect(panels[0].type).toBe('cart');
      if (panels[0].type === 'cart') {
        expect(panels[0].dayRange).toEqual({ start: 1, end: 28 });
      }
    });

    it('creates night_events panel from night_event condition', () => {
      const filter: FilterRoot = {
        id: 'test',
        logic: 'and',
        conditions: [
          { type: 'night_event', daySpec: { type: 'range', start: 1, end: 7 }, eventType: 'fairy' },
        ],
      };
      const panels = filterToPanels(filter);

      expect(panels).toHaveLength(1);
      expect(panels[0].type).toBe('night_events');
    });

    it('creates weather panel from weather condition', () => {
      const filter: FilterRoot = {
        id: 'test',
        logic: 'and',
        conditions: [
          { type: 'weather', daySpec: { type: 'exact', day: 3 }, weatherType: 'rain' },
        ],
      };
      const panels = filterToPanels(filter);

      expect(panels).toHaveLength(1);
      expect(panels[0].type).toBe('weather');
    });

    it('creates geodes panel from geode conditions', () => {
      const filter: FilterRoot = {
        id: 'test',
        logic: 'or',
        conditions: [
          { type: 'geode', geodeNumber: 1, geodeType: 'omni', targetItems: [74] },
          { type: 'geode', geodeNumber: 5, geodeType: 'omni', targetItems: [74] },
          { type: 'geode', geodeNumber: 10, geodeType: 'omni', targetItems: [74] },
        ],
      };
      const panels = filterToPanels(filter);

      expect(panels).toHaveLength(1);
      expect(panels[0].type).toBe('geodes');
      if (panels[0].type === 'geodes') {
        expect(panels[0].geodeType).toBe('omni');
        expect(panels[0].geodeRange).toEqual({ start: 1, end: 10 });
      }
    });

    it('creates separate panels for different geode types', () => {
      const filter: FilterRoot = {
        id: 'test',
        logic: 'or',
        conditions: [
          { type: 'geode', geodeNumber: 1, geodeType: 'omni', targetItems: [74] },
          { type: 'geode', geodeNumber: 2, geodeType: 'frozen', targetItems: [72] },
        ],
      };
      const panels = filterToPanels(filter);

      expect(panels).toHaveLength(2);
      const types = panels.map((p) => (p.type === 'geodes' ? p.geodeType : null));
      expect(types).toContain('omni');
      expect(types).toContain('frozen');
    });

    it('creates mine_floors panel from mine_floor condition', () => {
      const filter: FilterRoot = {
        id: 'test',
        logic: 'and',
        conditions: [
          {
            type: 'mine_floor',
            daySpec: { type: 'exact', day: 5 },
            floorRange: { start: 1, end: 50 },
            noMonsters: true,
          },
        ],
      };
      const panels = filterToPanels(filter);

      expect(panels).toHaveLength(1);
      expect(panels[0].type).toBe('mine_floors');
      if (panels[0].type === 'mine_floors') {
        expect(panels[0].day).toBe(5);
        expect(panels[0].floorRange).toEqual({ start: 1, end: 50 });
      }
    });

    it('creates dish panel from dish_of_day condition', () => {
      const filter: FilterRoot = {
        id: 'test',
        logic: 'and',
        conditions: [
          { type: 'dish_of_day', daySpec: { type: 'season', season: 0, year: 1 }, dishId: 195 },
        ],
      };
      const panels = filterToPanels(filter);

      expect(panels).toHaveLength(1);
      expect(panels[0].type).toBe('dish');
    });

    it('creates multiple panels from mixed conditions', () => {
      const filter: FilterRoot = {
        id: 'test',
        logic: 'and',
        conditions: [
          { type: 'daily_luck', daySpec: { type: 'exact', day: 1 }, minLuck: 0.07 },
          { type: 'cart_item', daySpec: { type: 'season', season: 0, year: 1 }, itemId: 266 },
          { type: 'night_event', daySpec: { type: 'range', start: 1, end: 7 }, eventType: 'fairy' },
        ],
      };
      const panels = filterToPanels(filter);

      expect(panels).toHaveLength(3);
      const types = panels.map((p) => p.type);
      expect(types).toContain('cart');
      expect(types).toContain('night_events');
      expect(types).toContain('daily_luck');
    });
  });

  describe('highlight extraction', () => {
    it('attaches cart highlights', () => {
      const filter: FilterRoot = {
        id: 'test',
        logic: 'and',
        conditions: [
          { type: 'cart_item', daySpec: { type: 'season', season: 0, year: 1 }, itemId: 266, maxPrice: 5000 },
        ],
      };
      const panels = filterToPanels(filter);

      expect(panels).toHaveLength(1);
      if (panels[0].type === 'cart') {
        expect(panels[0].highlights).toBeDefined();
        expect(panels[0].highlights).toHaveLength(1);
        expect(panels[0].highlights![0].itemId).toBe(266);
        expect(panels[0].highlights![0].maxPrice).toBe(5000);
        expect(panels[0].highlights![0].days).toContain(1);
        expect(panels[0].highlights![0].days).toContain(28);
      }
    });

    it('attaches luck highlights', () => {
      const filter: FilterRoot = {
        id: 'test',
        logic: 'and',
        conditions: [
          { type: 'daily_luck', daySpec: { type: 'exact', day: 5 }, minLuck: 0.07, maxLuck: 0.1 },
        ],
      };
      const panels = filterToPanels(filter);

      if (panels[0].type === 'daily_luck') {
        expect(panels[0].highlights).toBeDefined();
        expect(panels[0].highlights![0].minLuck).toBe(0.07);
        expect(panels[0].highlights![0].maxLuck).toBe(0.1);
        expect(panels[0].highlights![0].days).toEqual([5]);
      }
    });

    it('attaches night event highlights', () => {
      const filter: FilterRoot = {
        id: 'test',
        logic: 'and',
        conditions: [
          { type: 'night_event', daySpec: { type: 'range', start: 1, end: 7 }, eventType: 'fairy' },
        ],
      };
      const panels = filterToPanels(filter);

      if (panels[0].type === 'night_events') {
        expect(panels[0].highlights).toBeDefined();
        expect(panels[0].highlights![0].eventType).toBe('fairy');
        expect(panels[0].highlights![0].days).toEqual([1, 2, 3, 4, 5, 6, 7]);
      }
    });

    it('attaches weather highlights', () => {
      const filter: FilterRoot = {
        id: 'test',
        logic: 'and',
        conditions: [
          { type: 'weather', daySpec: { type: 'exact', day: 3 }, weatherType: 'rain' },
        ],
      };
      const panels = filterToPanels(filter);

      if (panels[0].type === 'weather') {
        expect(panels[0].highlights).toBeDefined();
        expect(panels[0].highlights![0].weatherType).toBe('rain');
        expect(panels[0].highlights![0].days).toEqual([3]);
      }
    });

    it('attaches geode highlights', () => {
      const filter: FilterRoot = {
        id: 'test',
        logic: 'or',
        conditions: [
          { type: 'geode', geodeNumber: 1, geodeType: 'omni', targetItems: [74, 72] },
          { type: 'geode', geodeNumber: 5, geodeType: 'omni', targetItems: [74] },
        ],
      };
      const panels = filterToPanels(filter);

      if (panels[0].type === 'geodes') {
        expect(panels[0].highlights).toBeDefined();
        expect(panels[0].highlights![0].geodeNumbers).toContain(1);
        expect(panels[0].highlights![0].geodeNumbers).toContain(5);
        expect(panels[0].highlights![0].targetItems).toContain(74);
        expect(panels[0].highlights![0].targetItems).toContain(72);
      }
    });

    it('attaches mine floor highlights for mushroom search', () => {
      const filter: FilterRoot = {
        id: 'test',
        logic: 'and',
        conditions: [
          {
            type: 'mine_floor',
            daySpec: { type: 'exact', day: 5 },
            floorRange: { start: 81, end: 90 },
            hasMushroom: true,
          },
        ],
      };
      const panels = filterToPanels(filter);

      if (panels[0].type === 'mine_floors') {
        expect(panels[0].highlights).toBeDefined();
        expect(panels[0].highlights![0].hasMushroom).toBe(true);
        expect(panels[0].highlights![0].floors).toContain(81);
        expect(panels[0].highlights![0].floors).toContain(90);
      }
    });

    it('does not attach mine floor highlights when hasMushroom is false', () => {
      const filter: FilterRoot = {
        id: 'test',
        logic: 'and',
        conditions: [
          {
            type: 'mine_floor',
            daySpec: { type: 'exact', day: 5 },
            floorRange: { start: 1, end: 50 },
            noMonsters: true,
            noDark: true,
            // hasMushroom not set or false
          },
        ],
      };
      const panels = filterToPanels(filter);

      if (panels[0].type === 'mine_floors') {
        // No highlights when not searching for mushrooms
        expect(panels[0].highlights).toBeUndefined();
      }
    });

    it('attaches dish highlights', () => {
      const filter: FilterRoot = {
        id: 'test',
        logic: 'and',
        conditions: [
          { type: 'dish_of_day', daySpec: { type: 'range', start: 1, end: 7 }, dishId: 195 },
        ],
      };
      const panels = filterToPanels(filter);

      if (panels[0].type === 'dish') {
        expect(panels[0].highlights).toBeDefined();
        expect(panels[0].highlights![0].dishId).toBe(195);
        expect(panels[0].highlights![0].days).toEqual([1, 2, 3, 4, 5, 6, 7]);
      }
    });

    it('handles multiple highlights of same type', () => {
      const filter: FilterRoot = {
        id: 'test',
        logic: 'or',
        conditions: [
          { type: 'cart_item', daySpec: { type: 'exact', day: 5 }, itemId: 266 },
          { type: 'cart_item', daySpec: { type: 'exact', day: 12 }, itemId: 270 },
        ],
      };
      const panels = filterToPanels(filter);

      if (panels[0].type === 'cart') {
        expect(panels[0].highlights).toHaveLength(2);
        const itemIds = panels[0].highlights!.map((h) => h.itemId);
        expect(itemIds).toContain(266);
        expect(itemIds).toContain(270);
      }
    });
  });

  describe('panel IDs', () => {
    it('generates unique IDs for each panel', () => {
      const filter: FilterRoot = {
        id: 'test',
        logic: 'and',
        conditions: [
          { type: 'daily_luck', daySpec: { type: 'exact', day: 1 } },
          { type: 'cart_item', daySpec: { type: 'exact', day: 5 }, itemId: 266 },
        ],
      };
      const panels = filterToPanels(filter);

      expect(panels[0].id).toBeTruthy();
      expect(panels[1].id).toBeTruthy();
      expect(panels[0].id).not.toBe(panels[1].id);
    });
  });
});

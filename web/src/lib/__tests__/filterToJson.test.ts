import { describe, it, expect } from 'vitest';
import { filterToSearchJson } from '$lib/utils/filterToJson';
import type { FilterGroup, FilterCondition } from '$lib/types/filters';

describe('filterToJson', () => {
  describe('empty filter', () => {
    it('returns empty conditions array for empty filter', () => {
      const filter: FilterGroup = {
        id: 'test',
        logic: 'and',
        conditions: [],
      };
      const result = JSON.parse(filterToSearchJson(filter));
      expect(result.logic).toBe('and');
      expect(result.conditions).toEqual([]);
    });
  });

  describe('single condition conversion', () => {
    it('converts daily_luck condition', () => {
      const filter: FilterGroup = {
        id: 'test',
        logic: 'and',
        conditions: [
          {
            type: 'daily_luck',
            daySpec: { type: 'exact', day: 5 },
            minLuck: 0.07,
            maxLuck: 0.1,
          },
        ],
      };
      const result = JSON.parse(filterToSearchJson(filter));

      expect(result.conditions).toHaveLength(1);
      const cond = result.conditions[0];
      expect(cond.logic).toBe('condition');
      expect(cond.type).toBe('daily_luck');
      expect(cond.day_start).toBe(5);
      expect(cond.day_end).toBe(5);
      expect(cond.min_luck).toBe(0.07);
      expect(cond.max_luck).toBe(0.1);
    });

    it('converts cart_item condition', () => {
      const filter: FilterGroup = {
        id: 'test',
        logic: 'and',
        conditions: [
          {
            type: 'cart_item',
            daySpec: { type: 'season', season: 0, year: 1 },
            itemId: 266,
            maxPrice: 5000,
          },
        ],
      };
      const result = JSON.parse(filterToSearchJson(filter));

      const cond = result.conditions[0];
      expect(cond.type).toBe('cart_item');
      expect(cond.item_id).toBe(266);
      expect(cond.max_price).toBe(5000);
      // Spring Y1 = days 1-28 (getDaysFromSpec returns all season days, WASM filters to cart days)
      expect(cond.day_start).toBe(1);
      expect(cond.day_end).toBe(28);
    });

    it('converts night_event condition', () => {
      const filter: FilterGroup = {
        id: 'test',
        logic: 'and',
        conditions: [
          {
            type: 'night_event',
            daySpec: { type: 'range', start: 1, end: 28 },
            eventType: 'fairy',
          },
        ],
      };
      const result = JSON.parse(filterToSearchJson(filter));

      const cond = result.conditions[0];
      expect(cond.type).toBe('night_event');
      expect(cond.day_start).toBe(1);
      expect(cond.day_end).toBe(28);
      expect(cond.event_type).toBe('fairy');
    });

    it('converts geode condition', () => {
      const filter: FilterGroup = {
        id: 'test',
        logic: 'and',
        conditions: [
          {
            type: 'geode',
            geodeNumber: 5,
            geodeType: 'omni',
            targetItems: [74, 72],
          },
        ],
      };
      const result = JSON.parse(filterToSearchJson(filter));

      const cond = result.conditions[0];
      expect(cond.type).toBe('geode');
      expect(cond.geode_number).toBe(5);
      expect(cond.geode_type).toBe('omni');
      expect(cond.target_items).toEqual([74, 72]);
    });

    it('converts dish_of_day condition', () => {
      const filter: FilterGroup = {
        id: 'test',
        logic: 'and',
        conditions: [
          {
            type: 'dish_of_day',
            daySpec: { type: 'exact', day: 10 },
            dishId: 195,
          },
        ],
      };
      const result = JSON.parse(filterToSearchJson(filter));

      const cond = result.conditions[0];
      expect(cond.type).toBe('dish_of_day');
      expect(cond.day_start).toBe(10);
      expect(cond.day_end).toBe(10);
      expect(cond.dish_id).toBe(195);
    });

    it('converts weather condition', () => {
      const filter: FilterGroup = {
        id: 'test',
        logic: 'and',
        conditions: [
          {
            type: 'weather',
            daySpec: { type: 'exact', day: 3 },
            weatherType: 'rain',
          },
        ],
      };
      const result = JSON.parse(filterToSearchJson(filter));

      const cond = result.conditions[0];
      expect(cond.type).toBe('weather');
      expect(cond.day_start).toBe(3);
      expect(cond.day_end).toBe(3);
      expect(cond.weather_type).toBe('rain');
    });

    it('converts mine_floor condition', () => {
      const filter: FilterGroup = {
        id: 'test',
        logic: 'and',
        conditions: [
          {
            type: 'mine_floor',
            daySpec: { type: 'exact', day: 5 },
            floorRange: { start: 1, end: 50 },
            noMonsters: true,
            noDark: true,
            hasMushroom: false,
          },
        ],
      };
      const result = JSON.parse(filterToSearchJson(filter));

      const cond = result.conditions[0];
      expect(cond.type).toBe('mine_floor');
      expect(cond.day_start).toBe(5);
      expect(cond.day_end).toBe(5);
      expect(cond.floor_start).toBe(1);
      expect(cond.floor_end).toBe(50);
      expect(cond.no_monsters).toBe(true);
      expect(cond.no_dark).toBe(true);
      expect(cond.has_mushroom).toBe(false);
    });
  });

  describe('DaySpec expansion', () => {
    it('handles exact day', () => {
      const filter: FilterGroup = {
        id: 'test',
        logic: 'and',
        conditions: [
          {
            type: 'daily_luck',
            daySpec: { type: 'exact', day: 15 },
          },
        ],
      };
      const result = JSON.parse(filterToSearchJson(filter));
      const cond = result.conditions[0];
      expect(cond.day_start).toBe(15);
      expect(cond.day_end).toBe(15);
    });

    it('handles day range', () => {
      const filter: FilterGroup = {
        id: 'test',
        logic: 'and',
        conditions: [
          {
            type: 'daily_luck',
            daySpec: { type: 'range', start: 10, end: 20 },
          },
        ],
      };
      const result = JSON.parse(filterToSearchJson(filter));
      const cond = result.conditions[0];
      expect(cond.day_start).toBe(10);
      expect(cond.day_end).toBe(20);
    });

    it('handles season (Spring Y1)', () => {
      const filter: FilterGroup = {
        id: 'test',
        logic: 'and',
        conditions: [
          {
            type: 'daily_luck',
            daySpec: { type: 'season', season: 0, year: 1 },
          },
        ],
      };
      const result = JSON.parse(filterToSearchJson(filter));
      const cond = result.conditions[0];
      expect(cond.day_start).toBe(1);
      expect(cond.day_end).toBe(28);
    });

    it('handles season (Summer Y2)', () => {
      const filter: FilterGroup = {
        id: 'test',
        logic: 'and',
        conditions: [
          {
            type: 'daily_luck',
            daySpec: { type: 'season', season: 1, year: 2 },
          },
        ],
      };
      const result = JSON.parse(filterToSearchJson(filter));
      const cond = result.conditions[0];
      // Summer Y2: seasonStart = 1*28 + 1 + (2-1)*112 = 141, so days 141-168
      expect(cond.day_start).toBe(141);
      expect(cond.day_end).toBe(168);
    });

    it('handles wide range correctly', () => {
      const filter: FilterGroup = {
        id: 'test',
        logic: 'and',
        conditions: [
          {
            type: 'daily_luck',
            daySpec: { type: 'range', start: 1, end: 224 },
          },
        ],
      };
      const result = JSON.parse(filterToSearchJson(filter));
      const cond = result.conditions[0];
      expect(cond.day_start).toBe(1);
      expect(cond.day_end).toBe(224);
    });
  });

  describe('optional field defaults', () => {
    it('defaults minLuck to -1 when not specified', () => {
      const filter: FilterGroup = {
        id: 'test',
        logic: 'and',
        conditions: [
          {
            type: 'daily_luck',
            daySpec: { type: 'exact', day: 1 },
            // minLuck not specified
            maxLuck: 0.1,
          },
        ],
      };
      const result = JSON.parse(filterToSearchJson(filter));
      expect(result.conditions[0].min_luck).toBe(-1);
    });

    it('defaults maxLuck to 1 when not specified', () => {
      const filter: FilterGroup = {
        id: 'test',
        logic: 'and',
        conditions: [
          {
            type: 'daily_luck',
            daySpec: { type: 'exact', day: 1 },
            minLuck: 0.05,
            // maxLuck not specified
          },
        ],
      };
      const result = JSON.parse(filterToSearchJson(filter));
      expect(result.conditions[0].max_luck).toBe(1);
    });

    it('defaults maxPrice to null when not specified', () => {
      const filter: FilterGroup = {
        id: 'test',
        logic: 'and',
        conditions: [
          {
            type: 'cart_item',
            daySpec: { type: 'exact', day: 5 },
            itemId: 266,
            // maxPrice not specified
          },
        ],
      };
      const result = JSON.parse(filterToSearchJson(filter));
      expect(result.conditions[0].max_price).toBeNull();
    });

    it('defaults mine_floor boolean flags to false when not specified', () => {
      const filter: FilterGroup = {
        id: 'test',
        logic: 'and',
        conditions: [
          {
            type: 'mine_floor',
            daySpec: { type: 'exact', day: 5 },
            floorRange: { start: 1, end: 20 },
            // noMonsters, noDark, hasMushroom not specified
          },
        ],
      };
      const result = JSON.parse(filterToSearchJson(filter));
      expect(result.conditions[0].no_monsters).toBe(false);
      expect(result.conditions[0].no_dark).toBe(false);
      expect(result.conditions[0].has_mushroom).toBe(false);
    });
  });

  describe('nested groups', () => {
    it('handles AND containing OR', () => {
      const filter: FilterGroup = {
        id: 'test',
        logic: 'and',
        conditions: [
          {
            type: 'daily_luck',
            daySpec: { type: 'exact', day: 1 },
            minLuck: 0.05,
          },
          {
            id: 'nested',
            logic: 'or',
            conditions: [
              {
                type: 'cart_item',
                daySpec: { type: 'exact', day: 5 },
                itemId: 266,
              },
              {
                type: 'cart_item',
                daySpec: { type: 'exact', day: 12 },
                itemId: 270,
              },
            ],
          },
        ],
      };
      const result = JSON.parse(filterToSearchJson(filter));

      expect(result.logic).toBe('and');
      expect(result.conditions).toHaveLength(2);

      // First condition is daily_luck
      expect(result.conditions[0].type).toBe('daily_luck');

      // Second is nested OR group
      expect(result.conditions[1].logic).toBe('or');
      expect(result.conditions[1].conditions).toHaveLength(2);
      expect(result.conditions[1].conditions[0].type).toBe('cart_item');
      expect(result.conditions[1].conditions[1].type).toBe('cart_item');
    });

    it('handles OR at top level', () => {
      const filter: FilterGroup = {
        id: 'test',
        logic: 'or',
        conditions: [
          {
            type: 'daily_luck',
            daySpec: { type: 'exact', day: 1 },
            minLuck: 0.07,
          },
          {
            type: 'night_event',
            daySpec: { type: 'range', start: 1, end: 28 },
            eventType: 'fairy',
          },
        ],
      };
      const result = JSON.parse(filterToSearchJson(filter));

      expect(result.logic).toBe('or');
      expect(result.conditions).toHaveLength(2);
    });

    it('handles deeply nested groups', () => {
      const filter: FilterGroup = {
        id: 'test',
        logic: 'and',
        conditions: [
          {
            id: 'level1',
            logic: 'or',
            conditions: [
              {
                id: 'level2',
                logic: 'and',
                conditions: [
                  {
                    type: 'daily_luck',
                    daySpec: { type: 'exact', day: 1 },
                    minLuck: 0.05,
                  },
                ],
              },
            ],
          },
        ],
      };
      const result = JSON.parse(filterToSearchJson(filter));

      expect(result.logic).toBe('and');
      expect(result.conditions[0].logic).toBe('or');
      expect(result.conditions[0].conditions[0].logic).toBe('and');
      expect(result.conditions[0].conditions[0].conditions[0].type).toBe('daily_luck');
    });
  });

  describe('output format', () => {
    it('produces valid JSON', () => {
      const filter: FilterGroup = {
        id: 'test',
        logic: 'and',
        conditions: [
          {
            type: 'daily_luck',
            daySpec: { type: 'exact', day: 1 },
          },
        ],
      };
      const json = filterToSearchJson(filter);
      expect(() => JSON.parse(json)).not.toThrow();
    });

    it('uses snake_case for WASM field names', () => {
      const filter: FilterGroup = {
        id: 'test',
        logic: 'and',
        conditions: [
          {
            type: 'cart_item',
            daySpec: { type: 'exact', day: 5 },
            itemId: 266,
            maxPrice: 5000,
          },
        ],
      };
      const json = filterToSearchJson(filter);

      // Check snake_case is used
      expect(json).toContain('item_id');
      expect(json).toContain('max_price');
      expect(json).toContain('day_start');
      expect(json).toContain('day_end');

      // Check camelCase is NOT used
      expect(json).not.toContain('itemId');
      expect(json).not.toContain('maxPrice');
      expect(json).not.toContain('dayStart');
      expect(json).not.toContain('dayEnd');
    });
  });
});

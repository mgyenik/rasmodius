import { describe, it, expect, vi } from 'vitest';
import type { FilterRoot } from '$lib/types/filters';
import type { ExplorePanel } from '$lib/types/explorePanels';

// Mock SvelteKit modules before importing urlNavigation
vi.mock('$app/navigation', () => ({
  pushState: vi.fn(),
  replaceState: vi.fn(),
}));

vi.mock('$app/stores', () => ({
  page: {
    subscribe: vi.fn(),
  },
}));

// Now import after mocks are set up
const { buildSearchParams } = await import('$lib/utils/urlNavigation');

describe('urlNavigation', () => {
  describe('buildSearchParams', () => {
    it('adds filter parameter when filter has conditions', () => {
      const filter: FilterRoot = {
        id: 'test',
        logic: 'and',
        conditions: [
          { type: 'daily_luck', daySpec: { type: 'exact', day: 1 }, minLuck: 0.07 },
        ],
      };

      const result = buildSearchParams({ filter });

      expect(result.has('f')).toBe(true);
      expect(result.get('f')).toBeTruthy();
    });

    it('removes filter parameter when filter is empty', () => {
      const filter: FilterRoot = {
        id: 'test',
        logic: 'and',
        conditions: [],
      };

      // Start with existing filter param
      const existingParams = new URLSearchParams('f=existingValue');
      const result = buildSearchParams({ filter }, existingParams);

      expect(result.has('f')).toBe(false);
    });

    it('adds panels parameter when panels provided', () => {
      const panels: ExplorePanel[] = [
        { type: 'daily_luck', id: 'test-1', dayRange: { start: 1, end: 28 } },
      ];

      const result = buildSearchParams({ panels, seed: 12345 });

      expect(result.has('e')).toBe(true);
    });

    it('adds seed parameter', () => {
      const result = buildSearchParams({ seed: 12345 });

      expect(result.get('seed')).toBe('12345');
    });

    it('adds version parameter', () => {
      const result = buildSearchParams({ version: '1.6' });

      expect(result.get('v')).toBe('1.6');
    });

    it('adds tab parameter', () => {
      const result = buildSearchParams({ activeTab: 'explore' });

      expect(result.get('tab')).toBe('explore');
    });

    it('combines multiple parameters', () => {
      const filter: FilterRoot = {
        id: 'test',
        logic: 'and',
        conditions: [
          { type: 'daily_luck', daySpec: { type: 'exact', day: 1 }, minLuck: 0.07 },
        ],
      };
      const panels: ExplorePanel[] = [
        { type: 'daily_luck', id: 'test-1', dayRange: { start: 1, end: 28 } },
      ];

      const result = buildSearchParams({
        filter,
        panels,
        seed: 12345,
        version: '1.6',
        activeTab: 'explore',
      });

      expect(result.has('f')).toBe(true);
      expect(result.has('e')).toBe(true);
      expect(result.get('seed')).toBe('12345');
      expect(result.get('v')).toBe('1.6');
      expect(result.get('tab')).toBe('explore');
    });

    it('preserves existing params not being updated', () => {
      const existingParams = new URLSearchParams('seed=99999&v=1.5');

      const result = buildSearchParams({ activeTab: 'search' }, existingParams);

      // Tab is added
      expect(result.get('tab')).toBe('search');
      // Existing params preserved
      expect(result.get('seed')).toBe('99999');
      expect(result.get('v')).toBe('1.5');
    });

    it('overwrites existing params when specified', () => {
      const existingParams = new URLSearchParams('seed=99999&v=1.5');

      const result = buildSearchParams({ seed: 12345, version: '1.6' }, existingParams);

      expect(result.get('seed')).toBe('12345');
      expect(result.get('v')).toBe('1.6');
    });

    it('handles undefined params without modifying them', () => {
      const existingParams = new URLSearchParams('seed=99999');

      // Only specifying activeTab, not touching seed
      const result = buildSearchParams({ activeTab: 'explore' }, existingParams);

      expect(result.get('seed')).toBe('99999'); // Preserved
      expect(result.get('tab')).toBe('explore'); // Added
    });

    it('removes panels param when empty panels array provided', () => {
      const existingParams = new URLSearchParams('e=existingValue');

      const result = buildSearchParams({ panels: [], seed: 1 }, existingParams);

      expect(result.has('e')).toBe(false);
    });
  });

  describe('JSON serialization for Svelte proxies', () => {
    it('handles objects that would be Svelte proxies', () => {
      // In real code, Svelte 5's $state creates Proxy objects
      // The buildSearchParams function doesn't do the JSON.parse/stringify,
      // but pushURLState/replaceURLState do. This test validates the pattern works.
      const filter: FilterRoot = {
        id: 'test',
        logic: 'and',
        conditions: [
          { type: 'daily_luck', daySpec: { type: 'exact', day: 1 }, minLuck: 0.07 },
        ],
      };

      // Simulate what pushURLState does with the clone
      const cloned = JSON.parse(JSON.stringify(filter));

      expect(cloned.id).toBe('test');
      expect(cloned.logic).toBe('and');
      expect(cloned.conditions[0].type).toBe('daily_luck');
    });

    it('handles nested objects with arrays', () => {
      const panels: ExplorePanel[] = [
        {
          type: 'geodes',
          id: 'test-1',
          geodeType: 'omni',
          geodeRange: { start: 1, end: 10 },
          highlights: [
            { geodeNumbers: [1, 5, 10], targetItems: [74, 72] },
          ],
        },
      ];

      const cloned = JSON.parse(JSON.stringify(panels));

      expect(cloned).toHaveLength(1);
      expect(cloned[0].type).toBe('geodes');
      expect(cloned[0].highlights[0].geodeNumbers).toEqual([1, 5, 10]);
      expect(cloned[0].highlights[0].targetItems).toEqual([74, 72]);
    });

    it('handles undefined values in objects', () => {
      const filter: FilterRoot = {
        id: 'test',
        logic: 'and',
        conditions: [
          {
            type: 'daily_luck',
            daySpec: { type: 'exact', day: 1 },
            // minLuck and maxLuck are undefined
          },
        ],
      };

      const cloned = JSON.parse(JSON.stringify(filter));

      expect(cloned.conditions[0].minLuck).toBeUndefined();
      expect(cloned.conditions[0].maxLuck).toBeUndefined();
    });
  });
});

import { describe, it, expect } from 'vitest';
import { encodeFilter, decodeFilter } from '$lib/utils/urlSerializer';
import type { FilterRoot } from '$lib/types/filters';

describe('URL Serializer', () => {
	describe('encodeFilter', () => {
		it('returns empty string for empty filter', () => {
			const filter: FilterRoot = {
				id: 'test',
				logic: 'and',
				conditions: [],
			};
			expect(encodeFilter(filter)).toBe('');
		});

		it('encodes a simple daily_luck filter', () => {
			const filter: FilterRoot = {
				id: 'test',
				logic: 'and',
				conditions: [
					{
						type: 'daily_luck',
						daySpec: { type: 'exact', day: 1 },
						minLuck: 0.07,
					},
				],
			};
			const encoded = encodeFilter(filter);
			expect(encoded).toBeTruthy();
			expect(encoded.length).toBeLessThan(100); // Should be compact
		});

		it('encodes a cart_item filter', () => {
			const filter: FilterRoot = {
				id: 'test',
				logic: 'and',
				conditions: [
					{
						type: 'cart_item',
						daySpec: { type: 'season', season: 0, year: 1 },
						itemId: 266,
					},
				],
			};
			const encoded = encodeFilter(filter);
			expect(encoded).toBeTruthy();
		});

		it('encodes a mine_floor filter', () => {
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
					},
				],
			};
			const encoded = encodeFilter(filter);
			expect(encoded).toBeTruthy();
		});
	});

	describe('decodeFilter', () => {
		it('returns null for empty string', () => {
			expect(decodeFilter('')).toBeNull();
		});

		it('returns null for invalid string', () => {
			expect(decodeFilter('invalid!!!')).toBeNull();
		});
	});

	describe('roundtrip', () => {
		it('correctly roundtrips a daily_luck filter', () => {
			const filter: FilterRoot = {
				id: 'test',
				logic: 'and',
				conditions: [
					{
						type: 'daily_luck',
						daySpec: { type: 'exact', day: 1 },
						minLuck: 0.07,
						maxLuck: 0.1,
					},
				],
			};
			const encoded = encodeFilter(filter);
			const decoded = decodeFilter(encoded);

			expect(decoded).not.toBeNull();
			expect(decoded!.logic).toBe('and');
			expect(decoded!.conditions).toHaveLength(1);

			const condition = decoded!.conditions[0];
			expect('type' in condition && condition.type).toBe('daily_luck');
			if ('type' in condition && condition.type === 'daily_luck') {
				expect(condition.daySpec.type).toBe('exact');
				expect(condition.minLuck).toBe(0.07);
				expect(condition.maxLuck).toBe(0.1);
			}
		});

		it('correctly roundtrips a night_event filter', () => {
			const filter: FilterRoot = {
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
			const encoded = encodeFilter(filter);
			const decoded = decodeFilter(encoded);

			expect(decoded).not.toBeNull();
			const condition = decoded!.conditions[0];
			if ('type' in condition && condition.type === 'night_event') {
				expect(condition.eventType).toBe('fairy');
				expect(condition.daySpec.type).toBe('range');
				if (condition.daySpec.type === 'range') {
					expect(condition.daySpec.start).toBe(1);
					expect(condition.daySpec.end).toBe(28);
				}
			}
		});

		it('correctly roundtrips a cart_item filter with season', () => {
			const filter: FilterRoot = {
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
			const encoded = encodeFilter(filter);
			const decoded = decodeFilter(encoded);

			expect(decoded).not.toBeNull();
			const condition = decoded!.conditions[0];
			if ('type' in condition && condition.type === 'cart_item') {
				expect(condition.itemId).toBe(266);
				expect(condition.maxPrice).toBe(5000);
				expect(condition.daySpec.type).toBe('season');
				if (condition.daySpec.type === 'season') {
					expect(condition.daySpec.season).toBe(0);
					expect(condition.daySpec.year).toBe(1);
				}
			}
		});

		it('correctly roundtrips a geode filter', () => {
			const filter: FilterRoot = {
				id: 'test',
				logic: 'or',
				conditions: [
					{
						type: 'geode',
						geodeNumber: 5,
						geodeType: 'omni',
						targetItems: [74, 72],
					},
				],
			};
			const encoded = encodeFilter(filter);
			const decoded = decodeFilter(encoded);

			expect(decoded).not.toBeNull();
			expect(decoded!.logic).toBe('or');
			const condition = decoded!.conditions[0];
			if ('type' in condition && condition.type === 'geode') {
				expect(condition.geodeNumber).toBe(5);
				expect(condition.geodeType).toBe('omni');
				expect(condition.targetItems).toEqual([74, 72]);
			}
		});

		it('correctly roundtrips a weather filter', () => {
			const filter: FilterRoot = {
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
			const encoded = encodeFilter(filter);
			const decoded = decodeFilter(encoded);

			expect(decoded).not.toBeNull();
			const condition = decoded!.conditions[0];
			if ('type' in condition && condition.type === 'weather') {
				expect(condition.weatherType).toBe('rain');
			}
		});

		it('correctly roundtrips a mine_floor filter', () => {
			const filter: FilterRoot = {
				id: 'test',
				logic: 'and',
				conditions: [
					{
						type: 'mine_floor',
						daySpec: { type: 'exact', day: 5 },
						floorRange: { start: 1, end: 50 },
						noMonsters: true,
						noDark: false,
						hasMushroom: true,
					},
				],
			};
			const encoded = encodeFilter(filter);
			const decoded = decodeFilter(encoded);

			expect(decoded).not.toBeNull();
			const condition = decoded!.conditions[0];
			if ('type' in condition && condition.type === 'mine_floor') {
				expect(condition.floorRange.start).toBe(1);
				expect(condition.floorRange.end).toBe(50);
				expect(condition.noMonsters).toBe(true);
				expect(condition.noDark).toBe(false);
				expect(condition.hasMushroom).toBe(true);
			}
		});

		it('correctly roundtrips multiple conditions', () => {
			const filter: FilterRoot = {
				id: 'test',
				logic: 'and',
				conditions: [
					{
						type: 'daily_luck',
						daySpec: { type: 'exact', day: 1 },
						minLuck: 0.05,
					},
					{
						type: 'cart_item',
						daySpec: { type: 'season', season: 0, year: 1 },
						itemId: 266,
					},
				],
			};
			const encoded = encodeFilter(filter);
			const decoded = decodeFilter(encoded);

			expect(decoded).not.toBeNull();
			expect(decoded!.conditions).toHaveLength(2);
		});

		it('correctly roundtrips season daySpec', () => {
			const filter: FilterRoot = {
				id: 'test',
				logic: 'and',
				conditions: [
					{
						type: 'daily_luck',
						daySpec: { type: 'season', season: 2, year: 3 },
						minLuck: 0.1,
					},
				],
			};
			const encoded = encodeFilter(filter);
			const decoded = decodeFilter(encoded);

			expect(decoded).not.toBeNull();
			const condition = decoded!.conditions[0];
			if ('type' in condition && condition.type === 'daily_luck') {
				expect(condition.daySpec.type).toBe('season');
			}
		});
	});

	describe('URL safety', () => {
		it('produces URL-safe output without special characters', () => {
			const filter: FilterRoot = {
				id: 'test',
				logic: 'and',
				conditions: [
					{
						type: 'geode',
						geodeNumber: 1,
						geodeType: 'omni',
						targetItems: [74],
					},
				],
			};
			const encoded = encodeFilter(filter);
			// Should only contain alphanumeric, dash, underscore
			expect(encoded).toMatch(/^[A-Za-z0-9_-]*$/);
		});
	});
});

import { describe, it, expect } from 'vitest';
import {
	createEmptyFilter,
	generateId,
	FILTER_PRESETS,
	type FilterGroup,
	type DaySpec,
} from '../types/filters';

describe('Filter Utilities', () => {
	describe('createEmptyFilter', () => {
		it('should create an empty filter with AND logic', () => {
			const filter = createEmptyFilter();
			expect(filter.logic).toBe('and');
			expect(filter.conditions).toEqual([]);
			expect(filter.id).toBeDefined();
		});

		it('should generate unique IDs', () => {
			const filter1 = createEmptyFilter();
			const filter2 = createEmptyFilter();
			expect(filter1.id).not.toBe(filter2.id);
		});
	});

	describe('generateId', () => {
		it('should generate string IDs', () => {
			const id = generateId();
			expect(typeof id).toBe('string');
			expect(id.length).toBeGreaterThan(0);
		});

		it('should generate unique IDs', () => {
			const ids = new Set<string>();
			for (let i = 0; i < 100; i++) {
				ids.add(generateId());
			}
			expect(ids.size).toBe(100);
		});
	});

	describe('FILTER_PRESETS', () => {
		it('should have presets defined', () => {
			expect(FILTER_PRESETS.length).toBeGreaterThan(0);
		});

		it('should have valid preset structure', () => {
			for (const preset of FILTER_PRESETS) {
				expect(preset.name).toBeDefined();
				expect(preset.description).toBeDefined();
				expect(preset.filter).toBeDefined();
				expect(preset.filter.logic).toMatch(/^(and|or)$/);
				expect(Array.isArray(preset.filter.conditions)).toBe(true);
			}
		});

		it('should have Red Cabbage Y1 preset', () => {
			const preset = FILTER_PRESETS.find((p) => p.name.includes('Red Cabbage'));
			expect(preset).toBeDefined();
		});
	});
});

describe('DaySpec Types', () => {
	it('should allow exact day spec', () => {
		const spec: DaySpec = { type: 'exact', day: 5 };
		expect(spec.type).toBe('exact');
		expect(spec.day).toBe(5);
	});

	it('should allow range day spec', () => {
		const spec: DaySpec = { type: 'range', start: 1, end: 28 };
		expect(spec.type).toBe('range');
		expect(spec.start).toBe(1);
		expect(spec.end).toBe(28);
	});

	it('should allow season day spec', () => {
		const spec: DaySpec = { type: 'season', season: 0, year: 1 };
		expect(spec.type).toBe('season');
		expect(spec.season).toBe(0); // Spring
	});

	it('should allow cart_days spec', () => {
		const spec: DaySpec = { type: 'cart_days', season: 0 };
		expect(spec.type).toBe('cart_days');
	});

	it('should allow any day spec', () => {
		const spec: DaySpec = { type: 'any' };
		expect(spec.type).toBe('any');
	});
});

describe('FilterGroup Structure', () => {
	it('should support nested groups', () => {
		const filter: FilterGroup = {
			id: '1',
			logic: 'and',
			conditions: [
				{
					id: '2',
					logic: 'or',
					conditions: [
						{ type: 'daily_luck', daySpec: { type: 'exact', day: 1 }, minLuck: 0.05 },
						{ type: 'daily_luck', daySpec: { type: 'exact', day: 2 }, minLuck: 0.05 },
					],
				},
				{ type: 'night_event', daySpec: { type: 'range', start: 1, end: 28 }, eventType: 'fairy' },
			],
		};

		expect(filter.conditions.length).toBe(2);
		const nestedGroup = filter.conditions[0] as FilterGroup;
		expect(nestedGroup.logic).toBe('or');
		expect(nestedGroup.conditions.length).toBe(2);
	});
});

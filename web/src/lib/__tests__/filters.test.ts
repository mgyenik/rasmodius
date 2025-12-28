import { describe, it, expect } from 'vitest';
import {
	createEmptyFilter,
	generateId,
	FILTER_EXAMPLES,
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

	describe('FILTER_EXAMPLES', () => {
		it('should have examples defined', () => {
			expect(FILTER_EXAMPLES.length).toBeGreaterThan(0);
		});

		it('should have valid example structure', () => {
			for (const example of FILTER_EXAMPLES) {
				expect(example.name).toBeDefined();
				expect(example.description).toBeDefined();
				expect(example.filter).toBeDefined();
				expect(example.filter.logic).toMatch(/^(and|or)$/);
				expect(Array.isArray(example.filter.conditions)).toBe(true);
			}
		});

		it('should have Red Cabbage Y1 example', () => {
			const example = FILTER_EXAMPLES.find((p) => p.name.includes('Red Cabbage'));
			expect(example).toBeDefined();
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

	it('should allow range day spec', () => {
		const spec: DaySpec = { type: 'range', start: 1, end: 28 };
		expect(spec.type).toBe('range');
		expect(spec.start).toBe(1);
		expect(spec.end).toBe(28);
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

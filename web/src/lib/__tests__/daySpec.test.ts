import { describe, it, expect } from 'vitest';
import {
	getDaysFromSpec,
	getDayOfWeek,
	isCartDay,
	getSeason,
	getYear,
	getDayInfo,
} from '../utils/daySpec';

describe('getDaysFromSpec', () => {
	it('should handle exact day', () => {
		expect(getDaysFromSpec({ type: 'exact', day: 5 })).toEqual([5]);
		expect(getDaysFromSpec({ type: 'exact', day: 1 })).toEqual([1]);
	});

	it('should handle range', () => {
		expect(getDaysFromSpec({ type: 'range', start: 1, end: 5 })).toEqual([1, 2, 3, 4, 5]);
		expect(getDaysFromSpec({ type: 'range', start: 10, end: 12 })).toEqual([10, 11, 12]);
	});

	it('should handle season (Spring Y1)', () => {
		const days = getDaysFromSpec({ type: 'season', season: 0, year: 1 });
		expect(days.length).toBe(28);
		expect(days[0]).toBe(1);
		expect(days[27]).toBe(28);
	});

	it('should handle season (Summer Y1)', () => {
		const days = getDaysFromSpec({ type: 'season', season: 1, year: 1 });
		expect(days.length).toBe(28);
		expect(days[0]).toBe(29); // Day 29 is Summer 1
		expect(days[27]).toBe(56);
	});

	it('should handle season (Spring Y2)', () => {
		const days = getDaysFromSpec({ type: 'season', season: 0, year: 2 });
		expect(days.length).toBe(28);
		expect(days[0]).toBe(113); // Day 113 is Spring 1 Y2
	});

	it('should handle any', () => {
		const days = getDaysFromSpec({ type: 'any' }, 28);
		expect(days.length).toBe(28);
		expect(days[0]).toBe(1);
		expect(days[27]).toBe(28);
	});

	it('should respect maxDay limit', () => {
		const days = getDaysFromSpec({ type: 'any' }, 10);
		expect(days.length).toBe(10);
	});
});

describe('getDayOfWeek', () => {
	it('should return correct day of week', () => {
		expect(getDayOfWeek(1)).toBe(1); // Monday
		expect(getDayOfWeek(5)).toBe(5); // Friday
		expect(getDayOfWeek(7)).toBe(7); // Sunday
		expect(getDayOfWeek(8)).toBe(1); // Monday (next week)
	});
});

describe('isCartDay', () => {
	it('should identify cart days correctly', () => {
		expect(isCartDay(5)).toBe(true); // Friday
		expect(isCartDay(7)).toBe(true); // Sunday
		expect(isCartDay(12)).toBe(true); // Friday
		expect(isCartDay(14)).toBe(true); // Sunday

		expect(isCartDay(1)).toBe(false); // Monday
		expect(isCartDay(6)).toBe(false); // Saturday
	});
});

describe('getSeason', () => {
	it('should return correct season', () => {
		expect(getSeason(1)).toBe(0); // Spring
		expect(getSeason(28)).toBe(0); // Spring
		expect(getSeason(29)).toBe(1); // Summer
		expect(getSeason(57)).toBe(2); // Fall
		expect(getSeason(85)).toBe(3); // Winter
		expect(getSeason(113)).toBe(0); // Spring Y2
	});
});

describe('getYear', () => {
	it('should return correct year', () => {
		expect(getYear(1)).toBe(1);
		expect(getYear(112)).toBe(1);
		expect(getYear(113)).toBe(2);
		expect(getYear(224)).toBe(2);
		expect(getYear(225)).toBe(3);
	});
});

describe('getDayInfo', () => {
	it('should format day info correctly', () => {
		expect(getDayInfo(1)).toBe('Mon, Spring 1, Year 1');
		expect(getDayInfo(5)).toBe('Fri, Spring 5, Year 1');
		expect(getDayInfo(7)).toBe('Sun, Spring 7, Year 1');
		expect(getDayInfo(29)).toBe('Mon, Summer 1, Year 1');
		expect(getDayInfo(113)).toBe('Mon, Spring 1, Year 2');
	});
});

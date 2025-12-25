import { describe, it, expect } from 'vitest';
import { getItemName, getItem, ITEMS } from '../data/items';

describe('Item Database', () => {
	it('should have items loaded', () => {
		expect(Object.keys(ITEMS).length).toBeGreaterThan(100);
	});

	it('should get item name by ID', () => {
		expect(getItemName(266)).toBe('Red Cabbage');
		expect(getItemName(74)).toBe('Prismatic Shard');
		expect(getItemName(72)).toBe('Diamond');
	});

	it('should return Unknown for invalid IDs', () => {
		expect(getItemName(99999)).toBe('Unknown Item #99999');
		expect(getItemName(-999)).toBe('Unknown Item #-999');
	});

	it('should get full item info', () => {
		const item = getItem(74);
		expect(item).toBeDefined();
		expect(item?.name).toBe('Prismatic Shard');
		expect(item?.price).toBeGreaterThan(0);
	});

	it('should return undefined for invalid item', () => {
		expect(getItem(99999)).toBeUndefined();
	});

	it('should have common speedrun items', () => {
		// Items important for speedrunning
		expect(getItemName(266)).toBe('Red Cabbage'); // CC bundle
		expect(getItemName(417)).toBe('Sweet Gem Berry');
		expect(getItemName(433)).toBe('Coffee Bean');
		expect(getItemName(802)).toBe('Cactus Seeds');
	});
});

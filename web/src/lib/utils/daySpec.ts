import type { DaySpec } from '$lib/types/filters';

/**
 * Expand a DaySpec into concrete day numbers to check.
 * Used by both the worker and for testing.
 */
export function getDaysFromSpec(spec: DaySpec, maxDay: number = 224): number[] {
	switch (spec.type) {
		case 'exact':
			return [spec.day];

		case 'range':
			return Array.from({ length: spec.end - spec.start + 1 }, (_, i) => spec.start + i);

		case 'season': {
			const seasonStart = spec.season * 28 + 1 + ((spec.year ?? 1) - 1) * 112;
			return Array.from({ length: 28 }, (_, i) => seasonStart + i).filter((d) => d <= maxDay);
		}

		case 'any':
			return Array.from({ length: maxDay }, (_, i) => i + 1);
	}
}

/**
 * Get day of week (1=Mon, 7=Sun) from days played.
 */
export function getDayOfWeek(day: number): number {
	return ((day - 1) % 7) + 1;
}

/**
 * Check if a day is a cart day (Friday=5 or Sunday=7).
 */
export function isCartDay(day: number): boolean {
	const dow = getDayOfWeek(day);
	return dow === 5 || dow === 7;
}

/**
 * Get season (0-3) from days played.
 */
export function getSeason(day: number): number {
	return Math.floor((day - 1) / 28) % 4;
}

/**
 * Get year from days played.
 */
export function getYear(day: number): number {
	return Math.floor((day - 1) / 112) + 1;
}

/**
 * Get human-readable day info.
 */
export function getDayInfo(day: number): string {
	const season = getSeason(day);
	const dayOfMonth = ((day - 1) % 28) + 1;
	const year = getYear(day);
	const seasons = ['Spring', 'Summer', 'Fall', 'Winter'];
	const dayOfWeek = getDayOfWeek(day);
	const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
	return `${days[dayOfWeek - 1]}, ${seasons[season]} ${dayOfMonth}, Year ${year}`;
}

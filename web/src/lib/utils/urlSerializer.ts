/**
 * URL serialization for filter sharing
 *
 * Encodes filters to compact URL-safe strings and decodes them back.
 * Uses base64-encoded JSON with optional compression for longer filters.
 */

import type { FilterRoot, FilterCondition, FilterGroup, DaySpec } from '$lib/types/filters';
import { createEmptyFilter } from '$lib/types/filters';

// Short keys for compact encoding
const CONDITION_TYPE_MAP: Record<string, string> = {
  'daily_luck': 'l',
  'night_event': 'n',
  'cart_item': 'c',
  'geode': 'g',
  'dish_of_day': 'd',
  'weather': 'w',
  'mine_floor': 'm',
};

const CONDITION_TYPE_REVERSE: Record<string, string> = Object.fromEntries(
  Object.entries(CONDITION_TYPE_MAP).map(([k, v]) => [v, k])
);

const DAY_SPEC_TYPE_MAP: Record<string, string> = {
  'exact': 'e',
  'range': 'r',
  'season': 's',
  'cart_days': 'c',
  'any': 'a',
};

const DAY_SPEC_TYPE_REVERSE: Record<string, string> = Object.fromEntries(
  Object.entries(DAY_SPEC_TYPE_MAP).map(([k, v]) => [v, k])
);

/**
 * Compress a DaySpec to a compact object
 */
function compressDaySpec(spec: DaySpec): unknown {
  const t = DAY_SPEC_TYPE_MAP[spec.type];
  switch (spec.type) {
    case 'exact':
      return { t, d: spec.day };
    case 'range':
      return { t, s: spec.start, e: spec.end };
    case 'season':
      return { t, s: spec.season, y: spec.year };
    case 'cart_days':
      return spec.season !== undefined ? { t, s: spec.season } : { t };
    case 'any':
      return { t };
  }
}

/**
 * Decompress a compact object back to DaySpec
 */
function decompressDaySpec(obj: Record<string, unknown>): DaySpec {
  const type = DAY_SPEC_TYPE_REVERSE[obj.t as string] as DaySpec['type'];
  switch (type) {
    case 'exact':
      return { type: 'exact', day: obj.d as number };
    case 'range':
      return { type: 'range', start: obj.s as number, end: obj.e as number };
    case 'season':
      return { type: 'season', season: obj.s as 0 | 1 | 2 | 3, year: obj.y as number };
    case 'cart_days':
      return obj.s !== undefined
        ? { type: 'cart_days', season: obj.s as 0 | 1 | 2 | 3 }
        : { type: 'cart_days' };
    case 'any':
      return { type: 'any' };
    default:
      return { type: 'any' };
  }
}

/**
 * Compress a FilterCondition to a compact object
 */
function compressCondition(condition: FilterCondition): Record<string, unknown> {
  const base: Record<string, unknown> = { t: CONDITION_TYPE_MAP[condition.type] };

  switch (condition.type) {
    case 'daily_luck':
      base.ds = compressDaySpec(condition.daySpec);
      if (condition.minLuck !== undefined) base.mn = condition.minLuck;
      if (condition.maxLuck !== undefined) base.mx = condition.maxLuck;
      break;
    case 'night_event':
      base.ds = compressDaySpec(condition.daySpec);
      base.ev = condition.eventType;
      break;
    case 'cart_item':
      base.ds = compressDaySpec(condition.daySpec);
      base.i = condition.itemId;
      if (condition.maxPrice !== undefined) base.p = condition.maxPrice;
      break;
    case 'geode':
      base.n = condition.geodeNumber;
      base.gt = condition.geodeType;
      base.ti = condition.targetItems;
      break;
    case 'dish_of_day':
      base.ds = compressDaySpec(condition.daySpec);
      base.di = condition.dishId;
      break;
    case 'weather':
      base.ds = compressDaySpec(condition.daySpec);
      base.wt = condition.weatherType;
      break;
    case 'mine_floor':
      base.ds = compressDaySpec(condition.daySpec);
      base.fs = condition.floorRange.start;
      base.fe = condition.floorRange.end;
      if (condition.noMonsters) base.nm = 1;
      if (condition.noDark) base.nd = 1;
      if (condition.hasMushroom) base.hm = 1;
      break;
  }

  return base;
}

/**
 * Decompress a compact object back to FilterCondition
 */
function decompressCondition(obj: Record<string, unknown>): FilterCondition {
  const type = CONDITION_TYPE_REVERSE[obj.t as string] as FilterCondition['type'];

  switch (type) {
    case 'daily_luck':
      return {
        type: 'daily_luck',
        daySpec: decompressDaySpec(obj.ds as Record<string, unknown>),
        minLuck: obj.mn as number | undefined,
        maxLuck: obj.mx as number | undefined,
      };
    case 'night_event':
      return {
        type: 'night_event',
        daySpec: decompressDaySpec(obj.ds as Record<string, unknown>),
        eventType: obj.ev as 'fairy' | 'witch' | 'meteor' | 'ufo' | 'owl' | 'any',
      };
    case 'cart_item':
      return {
        type: 'cart_item',
        daySpec: decompressDaySpec(obj.ds as Record<string, unknown>),
        itemId: obj.i as number,
        maxPrice: obj.p as number | undefined,
      };
    case 'geode':
      return {
        type: 'geode',
        geodeNumber: obj.n as number,
        geodeType: obj.gt as 'geode' | 'frozen' | 'magma' | 'omni' | 'trove' | 'coconut',
        targetItems: obj.ti as number[],
      };
    case 'dish_of_day':
      return {
        type: 'dish_of_day',
        daySpec: decompressDaySpec(obj.ds as Record<string, unknown>),
        dishId: obj.di as number,
      };
    case 'weather':
      return {
        type: 'weather',
        daySpec: decompressDaySpec(obj.ds as Record<string, unknown>),
        weatherType: obj.wt as 'sunny' | 'rain' | 'storm' | 'windy' | 'snow' | 'any',
      };
    case 'mine_floor':
      return {
        type: 'mine_floor',
        daySpec: decompressDaySpec(obj.ds as Record<string, unknown>),
        floorRange: { start: obj.fs as number, end: obj.fe as number },
        noMonsters: obj.nm === 1,
        noDark: obj.nd === 1,
        hasMushroom: obj.hm === 1,
      };
    default:
      throw new Error(`Unknown condition type: ${type}`);
  }
}

/**
 * Compress a FilterGroup to a compact object
 */
function compressGroup(group: FilterGroup): Record<string, unknown> {
  return {
    l: group.logic === 'and' ? 'a' : 'o',
    c: group.conditions.map(item => {
      if ('logic' in item) {
        return { g: compressGroup(item) };
      } else {
        return compressCondition(item);
      }
    }),
  };
}

/**
 * Decompress a compact object back to FilterGroup
 */
function decompressGroup(obj: Record<string, unknown>, id?: string): FilterGroup {
  const conditions = (obj.c as Record<string, unknown>[]).map(item => {
    if ('g' in item) {
      return decompressGroup(item.g as Record<string, unknown>, crypto.randomUUID());
    } else {
      return decompressCondition(item);
    }
  });

  return {
    id: id || crypto.randomUUID(),
    logic: obj.l === 'a' ? 'and' : 'or',
    conditions,
  };
}

/**
 * Encode a filter to a URL-safe string
 */
export function encodeFilter(filter: FilterRoot): string {
  if (filter.conditions.length === 0) {
    return '';
  }

  const compressed = compressGroup(filter);
  const json = JSON.stringify(compressed);

  // Use base64url encoding (URL-safe base64)
  const encoded = btoa(json)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  return encoded;
}

/**
 * Decode a URL-safe string back to a filter
 */
export function decodeFilter(encoded: string): FilterRoot | null {
  if (!encoded) {
    return null;
  }

  try {
    // Restore base64 padding and characters
    let base64 = encoded
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    // Add padding if needed
    while (base64.length % 4) {
      base64 += '=';
    }

    const json = atob(base64);
    const compressed = JSON.parse(json);

    return decompressGroup(compressed);
  } catch (e) {
    console.error('Failed to decode filter:', e);
    return null;
  }
}

/**
 * Get the current filter from URL search params
 */
export function getFilterFromURL(): FilterRoot | null {
  if (typeof window === 'undefined') return null;

  const params = new URLSearchParams(window.location.search);
  const filterParam = params.get('f');

  if (!filterParam) return null;

  return decodeFilter(filterParam);
}

/**
 * Update the URL with the current filter (without page reload)
 */
export function updateURLWithFilter(filter: FilterRoot): void {
  if (typeof window === 'undefined') return;

  const encoded = encodeFilter(filter);
  const url = new URL(window.location.href);

  if (encoded) {
    url.searchParams.set('f', encoded);
  } else {
    url.searchParams.delete('f');
  }

  // Update URL without reload
  window.history.replaceState({}, '', url.toString());
}

/**
 * Get a shareable URL for the current filter
 */
export function getShareableURL(filter: FilterRoot): string {
  if (typeof window === 'undefined') return '';

  const encoded = encodeFilter(filter);
  const url = new URL(window.location.origin + window.location.pathname);

  if (encoded) {
    url.searchParams.set('f', encoded);
  }

  return url.toString();
}

/**
 * Also support seed parameter in URL
 */
export function getSeedFromURL(): number | null {
  if (typeof window === 'undefined') return null;

  const params = new URLSearchParams(window.location.search);
  const seedParam = params.get('seed');

  if (!seedParam) return null;

  const seed = parseInt(seedParam, 10);
  return isNaN(seed) ? null : seed;
}

/**
 * Get day from URL
 */
export function getDayFromURL(): number | null {
  if (typeof window === 'undefined') return null;

  const params = new URLSearchParams(window.location.search);
  const dayParam = params.get('day');

  if (!dayParam) return null;

  const day = parseInt(dayParam, 10);
  return isNaN(day) ? null : day;
}

/**
 * Update URL with seed and day
 */
export function updateURLWithSeedAndDay(seed: number, day: number): void {
  if (typeof window === 'undefined') return;

  const url = new URL(window.location.href);
  url.searchParams.set('seed', seed.toString());
  url.searchParams.set('day', day.toString());

  window.history.replaceState({}, '', url.toString());
}

/**
 * Get version from URL
 */
export function getVersionFromURL(): '1.3' | '1.4' | '1.5' | '1.6' | null {
  if (typeof window === 'undefined') return null;

  const params = new URLSearchParams(window.location.search);
  const versionParam = params.get('v');

  if (!versionParam) return null;

  if (['1.3', '1.4', '1.5', '1.6'].includes(versionParam)) {
    return versionParam as '1.3' | '1.4' | '1.5' | '1.6';
  }
  return null;
}

/**
 * Update URL with version
 */
export function updateURLWithVersion(version: string): void {
  if (typeof window === 'undefined') return;

  const url = new URL(window.location.href);
  url.searchParams.set('v', version);

  window.history.replaceState({}, '', url.toString());
}

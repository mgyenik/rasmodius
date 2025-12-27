/**
 * URL Navigation utilities using SvelteKit's navigation API
 *
 * This module provides pushState/replaceState wrappers that work with
 * SvelteKit's router to enable browser back/forward as undo/redo.
 */

import { pushState, replaceState } from '$app/navigation';
import { page } from '$app/stores';
import { get } from 'svelte/store';
import type { FilterRoot } from '$lib/types/filters';
import type { ExplorePanel, ExploreState } from '$lib/types/explorePanels';
import { encodeFilter, encodeExploreState } from './urlSerializer';

export interface URLStateParams {
  filter?: FilterRoot;
  panels?: ExplorePanel[];
  seed?: number;
  version?: string;
  activeTab?: 'search' | 'explore';
}

/**
 * Build URL search params from state
 */
function buildSearchParams(params: URLStateParams): URLSearchParams {
  const currentPage = get(page);
  const searchParams = new URLSearchParams(currentPage.url.searchParams);

  // Filter
  if (params.filter !== undefined) {
    const encoded = encodeFilter(params.filter);
    if (encoded) {
      searchParams.set('f', encoded);
    } else {
      searchParams.delete('f');
    }
  }

  // Explore panels
  if (params.panels !== undefined) {
    const state: ExploreState = { seed: params.seed ?? 1, panels: params.panels };
    const encoded = encodeExploreState(state);
    if (encoded) {
      searchParams.set('e', encoded);
    } else {
      searchParams.delete('e');
    }
  }

  // Seed
  if (params.seed !== undefined) {
    searchParams.set('seed', params.seed.toString());
  }

  // Version
  if (params.version !== undefined) {
    searchParams.set('v', params.version);
  }

  // Active tab
  if (params.activeTab !== undefined) {
    searchParams.set('tab', params.activeTab);
  }

  return searchParams;
}

/**
 * Push state to history - creates a new undo point
 *
 * Use this for meaningful actions:
 * - Add/remove filter condition
 * - Add/remove explore panel
 * - Save panel edit
 * - Switch tabs
 * - Change seed (debounced)
 */
export function pushURLState(params: URLStateParams): void {
  const searchParams = buildSearchParams(params);
  const currentPage = get(page);
  const url = new URL(currentPage.url);
  url.search = searchParams.toString();

  // SvelteKit's pushState - creates history entry with state
  // The state object is restored on back/forward via page.state
  // Note: We must clone the objects because Svelte 5's $state creates proxies
  // which can't be cloned by the History API's structured clone algorithm
  pushState(url.toString(), {
    filter: params.filter ? JSON.parse(JSON.stringify(params.filter)) : undefined,
    panels: params.panels ? JSON.parse(JSON.stringify(params.panels)) : undefined,
    seed: params.seed,
    version: params.version,
    activeTab: params.activeTab,
  });
}

/**
 * Replace current state - does NOT create undo point
 *
 * Use this for intermediate states:
 * - Typing in inputs
 * - Editing panel before save
 * - Version changes
 */
export function replaceURLState(params: URLStateParams): void {
  const searchParams = buildSearchParams(params);
  const currentPage = get(page);
  const url = new URL(currentPage.url);
  url.search = searchParams.toString();

  // SvelteKit's replaceState - overwrites current entry
  // Note: We must clone the objects because Svelte 5's $state creates proxies
  replaceState(url.toString(), {
    filter: params.filter ? JSON.parse(JSON.stringify(params.filter)) : undefined,
    panels: params.panels ? JSON.parse(JSON.stringify(params.panels)) : undefined,
    seed: params.seed,
    version: params.version,
    activeTab: params.activeTab,
  });
}

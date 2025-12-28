<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { page } from '$app/state';
	import { FilterBuilder } from '$lib/components/filter-builder';
	import ExploreView from '$lib/components/explore/ExploreView.svelte';
	import type { FilterRoot } from '$lib/types/filters';
	import { createEmptyFilter } from '$lib/types/filters';
	import type { ExplorePanel } from '$lib/types/explorePanels';
	import { createDefaultExploreState } from '$lib/types/explorePanels';
	import { filterToPanels } from '$lib/utils/filterToPanels';
	import { WorkerPool, type SearchProgress } from '$lib/workers/WorkerPool';
	import {
		getFilterFromURL,
		getSeedFromURL,
		getVersionFromURL,
		getShareableURL,
		getExploreFromURL,
		getShareableExploreURL,
	} from '$lib/utils/urlSerializer';
	import { pushURLState, replaceURLState } from '$lib/utils/urlNavigation';

	let wasmLoaded = $state(false);
	let seed = $state(12345);
	let gameVersion = $state<'1.3' | '1.4' | '1.5' | '1.6'>('1.6');
	let error = $state<string | null>(null);
	let activeTab = $state<'explore' | 'search'>('search');
	let copySuccess = $state(false);
	let infoCollapsed = $state(false);

	// Filter state
	let filter = $state<FilterRoot>(createEmptyFilter());
	let searchResults = $state<number[]>([]);
	let isSearching = $state(false);
	let searchProgress = $state<SearchProgress | null>(null);

	// Explore state - dynamic panels
	let explorePanels = $state<ExplorePanel[]>(createDefaultExploreState().panels);

	// Search settings
	let searchRange = $state<'10m' | '100m' | 'full'>('10m');
	let maxResults = $state(5);

	// Worker pool
	let workerPool: WorkerPool | null = null;
	let workerCount = $state(0);

	let wasm: typeof import('rasmodius') | null = $state(null);

	const SEARCH_RANGES: Record<string, { start: number; end: number; label: string }> = {
		'10m': { start: 0, end: 9999999, label: '10M seeds' },
		'100m': { start: 0, end: 99999999, label: '100M seeds' },
		full: { start: 0, end: 2147483647, label: 'Full range (2.1B)' },
	};

	onMount(async () => {
		// Load state from URL if present
		const urlSeed = getSeedFromURL();
		const urlVersion = getVersionFromURL();
		const urlFilter = getFilterFromURL();
		const urlPanels = getExploreFromURL();

		if (urlSeed !== null) seed = urlSeed;
		if (urlVersion !== null) gameVersion = urlVersion;
		if (urlFilter !== null) {
			filter = urlFilter;
			activeTab = 'search';
		}
		if (urlPanels !== null) {
			explorePanels = urlPanels;
			activeTab = 'explore';
		}

		try {
			// Load and initialize WASM module
			const wasmModule = await import('rasmodius');
			await wasmModule.default(); // Initialize WASM
			wasm = wasmModule;
			wasmLoaded = true;
		} catch (e) {
			error = `Failed to initialize WASM: ${e}`;
		}

		// Initialize worker pool in background (don't block page)
		try {
			workerPool = new WorkerPool();
			await workerPool.initialize();
			workerCount = workerPool.getWorkerCount();
		} catch (e) {
			console.error('Worker pool failed to initialize:', e);
			error = 'Search workers failed to initialize. Seed search will not be available.';
		}
	});

	onDestroy(() => {
		workerPool?.terminate();
	});

	function formatNumber(n: number): string {
		if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + 'B';
		if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
		if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
		return n.toString();
	}

	function formatTime(seconds: number): string {
		if (seconds < 60) return `${Math.round(seconds)}s`;
		if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
		return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
	}

	async function handleSearch(searchFilter: FilterRoot) {
		if (!workerPool || searchFilter.conditions.length === 0) return;

		isSearching = true;
		searchResults = [];
		searchProgress = null;
		error = null;

		const range = SEARCH_RANGES[searchRange];

		try {
			await workerPool.search(
				searchFilter,
				range.start,
				range.end,
				maxResults,
				{
					onMatch: (matchedSeed) => {
						searchResults = [...searchResults, matchedSeed];
					},
					onProgress: (progress) => {
						searchProgress = progress;
					},
					onComplete: (matches) => {
						searchResults = matches;
						isSearching = false;
					},
					onError: (msg) => {
						error = msg;
						isSearching = false;
					},
				},
				gameVersion
			);
		} catch (e) {
			error = `Search error: ${e}`;
			isSearching = false;
		}
	}

	function cancelSearch() {
		workerPool?.cancel();
		isSearching = false;
	}

	// Track if we're restoring state from URL (to avoid pushing during restore)
	let isRestoringFromURL = false;

	// Debounce timer for seed changes
	let seedDebounceTimer: ReturnType<typeof setTimeout> | null = null;

	function onVersionChange() {
		replaceURLState({ version: gameVersion });
	}

	// Called when FilterBuilder makes a meaningful change (add/remove condition, example, clear)
	function onFilterMeaningfulChange() {
		if (isRestoringFromURL) return;
		pushURLState({ filter, activeTab });
	}

	// Called when seed changes - debounced
	function onSeedChange() {
		if (isRestoringFromURL) return;
		if (seedDebounceTimer) clearTimeout(seedDebounceTimer);
		seedDebounceTimer = setTimeout(() => {
			pushURLState({ panels: explorePanels, seed, activeTab });
		}, 500);
	}

	// Handle tab switching
	function switchToSearch() {
		if (activeTab === 'search') return;
		activeTab = 'search';
		if (!isRestoringFromURL) {
			pushURLState({ filter, activeTab });
		}
	}

	function switchToExplore() {
		if (activeTab === 'explore') return;
		activeTab = 'explore';
		if (!isRestoringFromURL) {
			pushURLState({ panels: explorePanels, seed, activeTab });
		}
	}

	async function copyFilterLink() {
		const url = getShareableURL(filter);
		try {
			await navigator.clipboard.writeText(url);
			copySuccess = true;
			setTimeout(() => (copySuccess = false), 2000);
		} catch {
			// Fallback for older browsers
			const input = document.createElement('input');
			input.value = url;
			document.body.appendChild(input);
			input.select();
			document.execCommand('copy');
			document.body.removeChild(input);
			copySuccess = true;
			setTimeout(() => (copySuccess = false), 2000);
		}
	}

	async function copySeedLink() {
		const url = getShareableExploreURL(filter, explorePanels, seed);
		try {
			await navigator.clipboard.writeText(url);
			copySuccess = true;
			setTimeout(() => (copySuccess = false), 2000);
		} catch {
			// Fallback for older browsers
			const input = document.createElement('input');
			input.value = url;
			document.body.appendChild(input);
			input.select();
			document.execCommand('copy');
			document.body.removeChild(input);
			copySuccess = true;
			setTimeout(() => (copySuccess = false), 2000);
		}
	}

	function exploreSearchResult(matchingSeed: number) {
		seed = matchingSeed;
		// Convert filter to explore panels
		const panels = filterToPanels(filter);
		if (panels.length > 0) {
			explorePanels = panels;
		}
		activeTab = 'explore';
		pushURLState({ panels: explorePanels, seed, activeTab });
	}

	// Explore panel handlers - called from ExploreView
	function handlePanelAdd(panel: ExplorePanel) {
		explorePanels = [...explorePanels, panel];
		if (!isRestoringFromURL) {
			pushURLState({ panels: explorePanels, seed, activeTab });
		}
	}

	function handlePanelRemove(panelId: string) {
		explorePanels = explorePanels.filter((p) => p.id !== panelId);
		if (!isRestoringFromURL) {
			pushURLState({ panels: explorePanels, seed, activeTab });
		}
	}

	function handlePanelUpdate(updated: ExplorePanel) {
		explorePanels = explorePanels.map((p) => (p.id === updated.id ? updated : p));
		if (!isRestoringFromURL) {
			pushURLState({ panels: explorePanels, seed, activeTab });
		}
	}

	// Track whether we've made any navigation (to distinguish initial load from back to start)
	let hasNavigated = $state(false);

	// Derive page state reactively
	const pageState = $derived(
		page.state as {
			filter?: FilterRoot;
			panels?: ExplorePanel[];
			seed?: number;
			version?: '1.3' | '1.4' | '1.5' | '1.6';
			activeTab?: 'search' | 'explore';
		}
	);

	// Watch for page.state changes (back/forward navigation)
	// SvelteKit restores page.state automatically on history navigation
	$effect(() => {
		const hasState = pageState && Object.keys(pageState).length > 0;

		// If there's state, restore it (this happens on back/forward)
		if (hasState) {
			isRestoringFromURL = true;
			hasNavigated = true;

			if (pageState.filter !== undefined) {
				filter = pageState.filter;
			}
			if (pageState.panels !== undefined) {
				explorePanels = pageState.panels;
			}
			if (pageState.seed !== undefined) {
				seed = pageState.seed;
			}
			if (pageState.version !== undefined) {
				gameVersion = pageState.version;
			}
			if (pageState.activeTab !== undefined) {
				activeTab = pageState.activeTab;
			}

			isRestoringFromURL = false;
		} else if (hasNavigated) {
			// Back to initial state (empty) - reset to defaults
			isRestoringFromURL = true;
			filter = createEmptyFilter();
			activeTab = 'search';
			isRestoringFromURL = false;
		}
	});
</script>

<svelte:head>
	<title>Rasmodius - Stardew Valley Seed Finder</title>
</svelte:head>

<main class="min-h-screen bg-amber-50 p-4 md:p-8">
	<div class="max-w-6xl mx-auto">
		<header class="mb-6">
			<div class="flex items-center justify-between mb-2">
				<h1 class="text-4xl font-bold text-amber-900">Rasmodius</h1>
				<button
					onclick={() => (infoCollapsed = !infoCollapsed)}
					class="text-amber-600 hover:text-amber-800 text-sm flex items-center gap-1"
				>
					{#if infoCollapsed}
						<span>Show info</span>
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M19 9l-7 7-7-7"
							/>
						</svg>
					{:else}
						<span>Hide info</span>
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M5 15l7-7 7 7"
							/>
						</svg>
					{/if}
				</button>
			</div>
			<p class="text-amber-700">Stardew Valley Seed Finder</p>

			{#if !infoCollapsed}
				<div class="mt-4 bg-white/50 rounded-lg p-4 text-sm text-amber-800 space-y-3">
					<p>
						A high-performance seed finder for <strong>speedrunners</strong> and
						<strong>challenge players</strong>. Search millions of seeds to find ones with specific
						characteristics (cart items, lucky days, night events, weather, geodes, mine
						conditions), then explore them with dynamic prediction panels.
					</p>

					<div class="flex flex-wrap gap-x-6 gap-y-1 text-amber-700">
						<span class="flex items-center gap-1">
							<svg
								class="w-4 h-4 text-green-600"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M5 13l4 4L19 7"
								/>
							</svg>
							100% client-side — nothing sent to servers
						</span>
						<span class="flex items-center gap-1">
							<svg
								class="w-4 h-4 text-green-600"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M5 13l4 4L19 7"
								/>
							</svg>
							No tracking or analytics
						</span>
						<span class="flex items-center gap-1">
							<svg
								class="w-4 h-4 text-green-600"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M5 13l4 4L19 7"
								/>
							</svg>
							<a
								href="https://github.com/mgyenik/rasmodius"
								target="_blank"
								rel="noopener"
								class="underline hover:text-amber-900">Open source (MIT)</a
							>
						</span>
					</div>

					<div class="border-t border-amber-200 pt-3">
						<p class="font-medium mb-1">How to use:</p>
						<ol class="list-decimal list-inside space-y-0.5 text-amber-700">
							<li>Add filters for what you want (cart items, lucky days, events)</li>
							<li>Click "Search Seeds" to find matching seeds</li>
							<li>Click any result to explore it with detailed predictions</li>
						</ol>
					</div>

					<p class="text-xs text-amber-600 border-t border-amber-200 pt-3">
						Built on the incredible RNG research from
						<a
							href="https://github.com/MouseyPounds/stardew-predictor"
							target="_blank"
							rel="noopener"
							class="underline hover:text-amber-800">stardew-predictor</a
						>
						and
						<a
							href="https://github.com/Bla-De/StardewSeedScripts"
							target="_blank"
							rel="noopener"
							class="underline hover:text-amber-800">StardewSeedScripts</a
						>.
					</p>
				</div>
			{/if}
		</header>

		{#if error}
			<div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
				{error}
				<button onclick={() => (error = null)} class="ml-2 font-bold">×</button>
			</div>
		{/if}

		{#if !wasmLoaded}
			<div class="bg-white rounded-lg shadow-md p-6 text-center">
				<p class="text-gray-500">Loading WASM module...</p>
			</div>
		{:else}
			<!-- Tab Navigation -->
			<div class="flex gap-2 mb-6">
				<button
					onclick={switchToSearch}
					class="px-4 py-2 rounded-t-lg font-medium transition-colors {activeTab === 'search'
						? 'bg-white text-amber-800 shadow-md'
						: 'bg-amber-100 text-amber-600 hover:bg-amber-200'}"
				>
					Search Seeds
					{#if workerCount > 0}
						<span class="text-xs text-amber-500 ml-1">({workerCount} workers)</span>
					{/if}
				</button>
				<button
					onclick={switchToExplore}
					class="px-4 py-2 rounded-t-lg font-medium transition-colors {activeTab === 'explore'
						? 'bg-white text-amber-800 shadow-md'
						: 'bg-amber-100 text-amber-600 hover:bg-amber-200'}"
				>
					Explore Seed
				</button>
			</div>

			{#if activeTab === 'explore'}
				<!-- Explore Tab -->
				<div class="bg-white rounded-lg shadow-md p-6">
					<ExploreView
						bind:seed
						bind:panels={explorePanels}
						version={gameVersion}
						{wasm}
						onCopyLink={copySeedLink}
						{copySuccess}
						onAddPanel={handlePanelAdd}
						onRemovePanel={handlePanelRemove}
						onUpdatePanel={handlePanelUpdate}
						{onSeedChange}
					/>
				</div>
			{:else}
				<!-- Search Tab -->
				<div class="bg-white rounded-lg shadow-md p-6 mb-6">
					<div class="flex items-center justify-between mb-4">
						<h2 class="text-xl font-semibold text-amber-800">Filter Builder</h2>
						{#if filter.conditions.length > 0}
							<button
								onclick={copyFilterLink}
								class="px-3 py-1 text-sm bg-amber-100 text-amber-800 rounded hover:bg-amber-200 transition-colors"
							>
								{copySuccess ? 'Copied!' : 'Share Filter'}
							</button>
						{/if}
					</div>
					<FilterBuilder
						bind:filter
						onSearch={handleSearch}
						onMeaningfulChange={onFilterMeaningfulChange}
					/>

					<!-- Search Options -->
					<div class="mt-6 pt-4 border-t border-gray-200">
						<div class="grid grid-cols-1 md:grid-cols-4 gap-4">
							<div>
								<label class="block text-sm font-medium text-gray-700 mb-1">Game Version</label>
								<select
									bind:value={gameVersion}
									onchange={onVersionChange}
									disabled={isSearching}
									class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
								>
									<option value="1.6">1.6 (Latest)</option>
									<option value="1.5">1.5</option>
									<option value="1.4">1.4</option>
									<option value="1.3">1.3</option>
								</select>
							</div>
							<div>
								<label class="block text-sm font-medium text-gray-700 mb-1">Search Range</label>
								<select
									bind:value={searchRange}
									disabled={isSearching}
									class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
								>
									{#each Object.entries(SEARCH_RANGES) as [key, range]}
										<option value={key}>{range.label}</option>
									{/each}
								</select>
							</div>
							<div>
								<label class="block text-sm font-medium text-gray-700 mb-1">Stop After</label>
								<input
									type="number"
									bind:value={maxResults}
									disabled={isSearching}
									min="1"
									max="1000"
									class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
								/>
							</div>
							<div class="flex items-end">
								{#if isSearching}
									<button
										onclick={cancelSearch}
										class="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
									>
										Cancel Search
									</button>
								{/if}
							</div>
						</div>
					</div>
				</div>

				{#if searchProgress}
					<div class="bg-white rounded-lg shadow-md p-6 mb-6">
						<div class="space-y-3">
							<!-- Progress Bar -->
							<div class="flex items-center gap-4">
								<div class="flex-1">
									<div class="h-3 bg-gray-200 rounded-full overflow-hidden">
										<div
											class="h-full bg-amber-500 transition-all duration-200"
											style="width: {(searchProgress.totalChecked / searchProgress.totalSeeds) *
												100}%"
										></div>
									</div>
								</div>
								<span class="text-sm font-mono text-gray-600 w-16 text-right">
									{((searchProgress.totalChecked / searchProgress.totalSeeds) * 100).toFixed(1)}%
								</span>
							</div>

							<!-- Stats -->
							<div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
								<div>
									<span class="text-gray-500">Checked:</span>
									<span class="font-mono ml-1">{formatNumber(searchProgress.totalChecked)}</span>
									<span class="text-gray-400">/ {formatNumber(searchProgress.totalSeeds)}</span>
								</div>
								<div>
									<span class="text-gray-500">Found:</span>
									<span class="font-mono ml-1 text-green-600">{searchProgress.matchesFound}</span>
								</div>
								<div>
									<span class="text-gray-500">Speed:</span>
									<span class="font-mono ml-1"
										>{formatNumber(Math.round(searchProgress.seedsPerSecond))}/s</span
									>
								</div>
								<div>
									<span class="text-gray-500">ETA:</span>
									<span class="font-mono ml-1">
										{#if searchProgress.isComplete}
											Done!
										{:else}
											{formatTime(searchProgress.estimatedTimeRemaining)}
										{/if}
									</span>
								</div>
							</div>
						</div>
					</div>
				{/if}

				{#if searchResults.length > 0}
					<div class="bg-white rounded-lg shadow-md p-6">
						<h2 class="text-xl font-semibold text-amber-800 mb-4">
							Found {searchResults.length} matching seed{searchResults.length !== 1 ? 's' : ''}
						</h2>
						<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
							{#each searchResults.slice(0, 50) as matchingSeed}
								<button
									onclick={() => exploreSearchResult(matchingSeed)}
									class="p-3 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors text-center border border-amber-200"
								>
									<div class="font-mono text-lg">{matchingSeed.toLocaleString()}</div>
									<div class="text-xs text-gray-500">Click to explore</div>
								</button>
							{/each}
						</div>
						{#if searchResults.length > 50}
							<p class="text-sm text-gray-500 mt-4">
								Showing first 50 of {searchResults.length} results
							</p>
						{/if}
					</div>
				{:else if !isSearching && filter.conditions.length > 0}
					<div class="bg-white rounded-lg shadow-md p-6 text-center text-gray-500">
						<p>Click "Search Seeds" to find matching seeds</p>
					</div>
				{/if}
			{/if}
		{/if}
	</div>
</main>

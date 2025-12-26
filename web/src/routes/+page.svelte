<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
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
		updateURLWithFilter,
		updateURLWithVersion,
		getExploreFromURL,
		updateURLWithExplore,
		getShareableExploreURL
	} from '$lib/utils/urlSerializer';

	let wasmLoaded = $state(false);
	let seed = $state(12345);
	let gameVersion = $state<'1.3' | '1.4' | '1.5' | '1.6'>('1.6');
	let error = $state<string | null>(null);
	let activeTab = $state<'explore' | 'search'>('search');
	let copySuccess = $state(false);

	// Filter state
	let filter = $state<FilterRoot>(createEmptyFilter());
	let searchResults = $state<number[]>([]);
	let isSearching = $state(false);
	let searchProgress = $state<SearchProgress | null>(null);

	// Explore state - dynamic panels
	let explorePanels = $state<ExplorePanel[]>(createDefaultExploreState().panels);

	// Search settings
	let searchRange = $state<'100k' | '1m' | '10m' | '100m' | 'full'>('1m');
	let maxResults = $state(5);

	// Worker pool
	let workerPool: WorkerPool | null = null;
	let workerCount = $state(0);


	let wasm: typeof import('rasmodius') | null = $state(null);

	const SEARCH_RANGES: Record<string, { start: number; end: number; label: string }> = {
		'100k': { start: 0, end: 99999, label: '100K seeds' },
		'1m': { start: 0, end: 999999, label: '1M seeds' },
		'10m': { start: 0, end: 9999999, label: '10M seeds' },
		'100m': { start: 0, end: 99999999, label: '100M seeds' },
		'full': { start: 0, end: 2147483647, label: 'Full range (2.1B)' },
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
			// Don't show error - search just won't work
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
					}
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

	function onVersionChange() {
		updateURLWithVersion(gameVersion);
	}

	// Auto-update URL when filter changes (enables back button undo)
	$effect(() => {
		// Access filter to trigger on any change
		JSON.stringify(filter);
		updateURLWithFilter(filter);
	});

	async function copyFilterLink() {
		const url = getShareableURL(filter);
		try {
			await navigator.clipboard.writeText(url);
			copySuccess = true;
			setTimeout(() => copySuccess = false, 2000);
		} catch (e) {
			// Fallback for older browsers
			const input = document.createElement('input');
			input.value = url;
			document.body.appendChild(input);
			input.select();
			document.execCommand('copy');
			document.body.removeChild(input);
			copySuccess = true;
			setTimeout(() => copySuccess = false, 2000);
		}
	}

	async function copySeedLink() {
		const url = getShareableExploreURL(filter, explorePanels, seed);
		try {
			await navigator.clipboard.writeText(url);
			copySuccess = true;
			setTimeout(() => copySuccess = false, 2000);
		} catch (e) {
			console.error('Failed to copy:', e);
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
		updateURLWithExplore(explorePanels, seed);
	}

	// Update URL when explore panels change
	$effect(() => {
		// Access panels to trigger on any change
		JSON.stringify(explorePanels);
		if (activeTab === 'explore') {
			updateURLWithExplore(explorePanels, seed);
		}
	});
</script>

<svelte:head>
	<title>Rasmodius - Stardew Valley Seed Finder</title>
</svelte:head>

<main class="min-h-screen bg-amber-50 p-4 md:p-8">
	<div class="max-w-6xl mx-auto">
		<header class="text-center mb-6">
			<h1 class="text-4xl font-bold text-amber-900 mb-2">Rasmodius</h1>
			<p class="text-amber-700 mb-4">Stardew Valley Seed Finder</p>
			<p class="text-sm text-amber-600 max-w-2xl mx-auto">
				<strong>1.</strong> Add filters for what you want (cart items, lucky days, events).
				<strong>2.</strong> Click "Search Seeds" to find matching seeds.
				<strong>3.</strong> Click any result to explore it with detailed predictions.
			</p>
		</header>

		{#if error}
			<div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
				{error}
				<button onclick={() => error = null} class="ml-2 font-bold">×</button>
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
					onclick={() => activeTab = 'search'}
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
					onclick={() => activeTab = 'explore'}
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
					<FilterBuilder bind:filter onSearch={handleSearch} />

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
											style="width: {(searchProgress.totalChecked / searchProgress.totalSeeds) * 100}%"
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
									<span class="font-mono ml-1">{formatNumber(Math.round(searchProgress.seedsPerSecond))}/s</span>
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
							<p class="text-sm text-gray-500 mt-4">Showing first 50 of {searchResults.length} results</p>
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

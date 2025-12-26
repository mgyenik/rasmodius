<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { getItemName } from '$lib/data/items';
	import { FilterBuilder } from '$lib/components/filter-builder';
	import type { FilterRoot } from '$lib/types/filters';
	import { createEmptyFilter } from '$lib/types/filters';
	import { WorkerPool, type SearchProgress } from '$lib/workers/WorkerPool';
	import { getDayInfo, isCartDay } from '$lib/utils/daySpec';
	import {
		getFilterFromURL,
		getSeedFromURL,
		getDayFromURL,
		getVersionFromURL,
		getShareableURL,
		updateURLWithFilter,
		updateURLWithSeedAndDay,
		updateURLWithVersion
	} from '$lib/utils/urlSerializer';

	let wasmLoaded = $state(false);
	let seed = $state(12345);
	let daysPlayed = $state(5);
	let gameVersion = $state<'1.3' | '1.4' | '1.5' | '1.6'>('1.6');
	let error = $state<string | null>(null);
	let activeTab = $state<'explore' | 'search'>('search');
	let copySuccess = $state(false);

	// Filter state
	let filter = $state<FilterRoot>(createEmptyFilter());
	let searchResults = $state<number[]>([]);
	let isSearching = $state(false);
	let searchProgress = $state<SearchProgress | null>(null);

	// Search settings
	let searchRange = $state<'100k' | '1m' | '10m' | '100m' | 'full'>('1m');
	let maxResults = $state(100);

	// Worker pool
	let workerPool: WorkerPool | null = null;
	let workerCount = $state(0);

	// Results - using unified API types
	let dailyLuck = $state<number | null>(null);
	let dishOfDay = $state<{ id: number; quantity: number } | null>(null);
	let nightEvent = $state<string | null>(null);
	let weatherTomorrow = $state<string | null>(null);
	let cartItems = $state<{ id: number; price: number; quantity: number }[]>([]);
	let geodeResults = $state<{ item_id: number; quantity: number }[]>([]);
	let monsterFloors = $state<number[]>([]);
	let darkFloors = $state<number[]>([]);
	let mushroomFloors = $state<number[]>([]);
	let redCabbageResult = $state<{ day: number; price: number } | null>(null);

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
		const urlDay = getDayFromURL();
		const urlVersion = getVersionFromURL();
		const urlFilter = getFilterFromURL();

		if (urlSeed !== null) seed = urlSeed;
		if (urlDay !== null) daysPlayed = urlDay;
		if (urlVersion !== null) gameVersion = urlVersion;
		if (urlFilter !== null) {
			filter = urlFilter;
			activeTab = 'search';
		}

		try {
			// Load and initialize WASM module
			const wasmModule = await import('rasmodius');
			await wasmModule.default(); // Initialize WASM
			wasm = wasmModule;
			wasmLoaded = true;
			calculateAll();
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

	function calculateAll() {
		if (!wasm) return;

		try {
			// Use unified predict_day API
			const prediction = wasm.predict_day(seed, daysPlayed, gameVersion);
			dailyLuck = prediction.luck;
			dishOfDay = prediction.dish;
			nightEvent = prediction.night_event;
			weatherTomorrow = prediction.weather;
			cartItems = prediction.cart ?? [];

			// Use unified predict_geodes API
			geodeResults = wasm.predict_geodes(seed, 1, 5, 'omni', gameVersion);

			// Mine floor conditions - still use batch APIs for efficiency
			monsterFloors = Array.from(wasm.find_monster_floors(seed, daysPlayed, 1, 50, gameVersion));
			darkFloors = Array.from(wasm.find_dark_floors(seed, daysPlayed, 1, 50));
			mushroomFloors = Array.from(wasm.find_mushroom_floors(seed, daysPlayed, 81, 120, gameVersion));

			// Red cabbage finder
			const rcResult = wasm.find_item_in_cart(seed, 266, 224, gameVersion);
			if (rcResult.length > 0) {
				redCabbageResult = { day: rcResult[0], price: rcResult[1] };
			} else {
				redCabbageResult = null;
			}
		} catch (e) {
			error = `Calculation error: ${e}`;
		}
	}

	function formatLuck(luck: number): string {
		if (luck >= 0.07) return '✨ Very Happy';
		if (luck >= 0.02) return '😊 Good';
		if (luck > -0.02) return '😐 Neutral';
		if (luck > -0.07) return '😕 Bad';
		return '💀 Very Bad';
	}

	function getLuckColor(luck: number): string {
		if (luck >= 0.07) return 'text-green-600';
		if (luck >= 0.02) return 'text-green-500';
		if (luck > -0.02) return 'text-gray-600';
		if (luck > -0.07) return 'text-orange-500';
		return 'text-red-600';
	}

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
						searchResults = matches.slice(0, maxResults);
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

	function onSeedChange() {
		if (wasmLoaded) calculateAll();
		updateURLWithSeedAndDay(seed, daysPlayed);
	}

	function onDayChange() {
		if (wasmLoaded) calculateAll();
		updateURLWithSeedAndDay(seed, daysPlayed);
	}

	function onVersionChange() {
		if (wasmLoaded) calculateAll();
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
		const url = new URL(window.location.origin + window.location.pathname);
		url.searchParams.set('seed', seed.toString());
		url.searchParams.set('day', daysPlayed.toString());
		url.searchParams.set('v', gameVersion);
		try {
			await navigator.clipboard.writeText(url.toString());
			copySuccess = true;
			setTimeout(() => copySuccess = false, 2000);
		} catch (e) {
			console.error('Failed to copy:', e);
		}
	}
</script>

<svelte:head>
	<title>Rasmodius - Stardew Valley Seed Finder</title>
</svelte:head>

<main class="min-h-screen bg-amber-50 p-4 md:p-8">
	<div class="max-w-6xl mx-auto">
		<header class="text-center mb-8">
			<h1 class="text-4xl font-bold text-amber-900 mb-2">Rasmodius</h1>
			<p class="text-amber-700">Stardew Valley Seed Finder</p>
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
				<div class="bg-white rounded-lg shadow-md p-6 mb-6">
					<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
						<div>
							<label for="seed" class="block text-sm font-medium text-gray-700 mb-1">
								Game Seed
							</label>
							<input
								id="seed"
								type="number"
								bind:value={seed}
								oninput={onSeedChange}
								class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
							/>
						</div>
						<div>
							<label for="day" class="block text-sm font-medium text-gray-700 mb-1">
								Days Played
							</label>
							<input
								id="day"
								type="number"
								bind:value={daysPlayed}
								oninput={onDayChange}
								min="1"
								class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
							/>
							<p class="text-sm text-gray-500 mt-1">
								{getDayInfo(daysPlayed)}
								{#if isCartDay(daysPlayed)}
									<span class="text-green-600 ml-2">🛒 Cart Day</span>
								{/if}
							</p>
						</div>
						<div>
							<label for="version" class="block text-sm font-medium text-gray-700 mb-1">
								Game Version
							</label>
							<select
								id="version"
								bind:value={gameVersion}
								onchange={onVersionChange}
								class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
							>
								<option value="1.6">1.6 (Latest)</option>
								<option value="1.5">1.5</option>
								<option value="1.4">1.4</option>
								<option value="1.3">1.3</option>
							</select>
							<p class="text-sm text-gray-500 mt-1">
								Affects RNG predictions
							</p>
						</div>
					</div>
					<div class="mt-4 pt-4 border-t border-gray-200">
						<button
							onclick={copySeedLink}
							class="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
						>
							{copySuccess ? 'Copied!' : 'Copy Link to This Seed'}
						</button>
					</div>
				</div>

				<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
					<div class="bg-white rounded-lg shadow-md p-6">
						<h2 class="text-xl font-semibold text-amber-800 mb-4">Daily Luck</h2>
						{#if dailyLuck !== null}
							<div class="flex items-center gap-4">
								<div class="text-3xl font-mono {getLuckColor(dailyLuck)}">
									{dailyLuck >= 0 ? '+' : ''}{(dailyLuck * 100).toFixed(1)}%
								</div>
								<div class="text-lg">{formatLuck(dailyLuck)}</div>
							</div>
						{/if}
					</div>

					<div class="bg-white rounded-lg shadow-md p-6">
						<h2 class="text-xl font-semibold text-amber-800 mb-4">Night Event</h2>
						<div class="text-2xl">
							{#if nightEvent === 'None'}
								<span class="text-gray-400">No event tonight</span>
							{:else if nightEvent === 'Fairy'}
								<span class="text-pink-500">🧚 Crop Fairy</span>
							{:else if nightEvent === 'Witch'}
								<span class="text-purple-600">🧙 Witch</span>
							{:else if nightEvent === 'Meteor'}
								<span class="text-orange-500">☄️ Meteorite</span>
							{:else if nightEvent === 'UFO'}
								<span class="text-green-500">👽 Strange Capsule</span>
							{:else if nightEvent === 'Owl'}
								<span class="text-gray-600">🦉 Stone Owl</span>
							{/if}
						</div>
					</div>

					<div class="bg-white rounded-lg shadow-md p-6">
						<h2 class="text-xl font-semibold text-amber-800 mb-4">Tomorrow's Weather</h2>
						<div class="text-2xl">
							{#if weatherTomorrow === 'Sunny'}
								<span class="text-yellow-500">☀️ Sunny</span>
							{:else if weatherTomorrow === 'Rain'}
								<span class="text-blue-500">🌧️ Rain</span>
							{:else if weatherTomorrow === 'Storm'}
								<span class="text-purple-600">⛈️ Storm</span>
							{:else if weatherTomorrow === 'Windy'}
								<span class="text-teal-500">🍃 Windy</span>
							{:else if weatherTomorrow === 'Snow'}
								<span class="text-blue-300">❄️ Snow</span>
							{:else}
								<span class="text-gray-400">{weatherTomorrow}</span>
							{/if}
						</div>
					</div>

					<div class="bg-white rounded-lg shadow-md p-6">
						<h2 class="text-xl font-semibold text-amber-800 mb-4">Saloon Dish</h2>
						{#if dishOfDay}
							<div class="flex items-center gap-2">
								<span class="text-lg font-medium">{getItemName(dishOfDay.id)}</span>
								<span class="text-gray-500">×{dishOfDay.quantity}</span>
							</div>
						{/if}
					</div>

					<div class="bg-white rounded-lg shadow-md p-6">
						<h2 class="text-xl font-semibold text-amber-800 mb-4">Traveling Cart</h2>
						{#if cartItems.length > 0}
							<div class="space-y-2 max-h-48 overflow-y-auto">
								{#each cartItems as item}
									<div class="flex justify-between py-1 border-b border-gray-200 last:border-0">
										<span class="font-medium">{getItemName(item.id)}</span>
										<span class="text-gray-600 text-sm">{item.price.toLocaleString()}g</span>
									</div>
								{/each}
							</div>
						{:else}
							<p class="text-gray-400">Cart appears on Fri/Sun</p>
						{/if}
					</div>
				</div>

				<div class="bg-white rounded-lg shadow-md p-6 mt-6">
					<h2 class="text-xl font-semibold text-amber-800 mb-4">Next 5 Omni Geodes</h2>
					<div class="grid grid-cols-2 md:grid-cols-5 gap-4">
						{#each geodeResults as result, i}
							<div class="text-center p-3 bg-gray-50 rounded-lg">
								<div class="text-xs text-gray-500 mb-1">#{i + 1}</div>
								<div class="font-medium text-sm">{getItemName(result.item_id)}</div>
								{#if result.quantity > 1}
									<div class="text-xs text-gray-400">×{result.quantity}</div>
								{/if}
							</div>
						{/each}
					</div>
				</div>

				<div class="bg-white rounded-lg shadow-md p-6 mt-6">
					<h2 class="text-xl font-semibold text-amber-800 mb-4">Mine Floors (1-50)</h2>
					<div class="space-y-3">
						<div>
							<span class="text-sm font-medium text-gray-700">Monster Floors:</span>
							{#if monsterFloors.length > 0}
								<span class="text-red-600 ml-2">{monsterFloors.join(', ')}</span>
							{:else}
								<span class="text-green-600 ml-2">None</span>
							{/if}
						</div>
						<div>
							<span class="text-sm font-medium text-gray-700">Dark Floors:</span>
							{#if darkFloors.length > 0}
								<span class="text-purple-600 ml-2">{darkFloors.join(', ')}</span>
							{:else}
								<span class="text-green-600 ml-2">None</span>
							{/if}
						</div>
						<div>
							<span class="text-sm font-medium text-gray-700">Mushroom Floors (81-120):</span>
							{#if mushroomFloors.length > 0}
								<span class="text-pink-600 ml-2">{mushroomFloors.join(', ')}</span>
							{:else}
								<span class="text-gray-500 ml-2">None</span>
							{/if}
						</div>
					</div>
				</div>

				<div class="bg-white rounded-lg shadow-md p-6 mt-6">
					<h2 class="text-xl font-semibold text-amber-800 mb-4">Red Cabbage Finder</h2>
					{#if redCabbageResult}
						<p class="text-green-600">
							<span class="font-medium">Red Cabbage</span> on Day {redCabbageResult.day}
							({getDayInfo(redCabbageResult.day)}) for {redCabbageResult.price.toLocaleString()}g
						</p>
					{:else}
						<p class="text-gray-500">Not found in first 2 years</p>
					{/if}
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
								<label class="block text-sm font-medium text-gray-700 mb-1">Max Results</label>
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
									onclick={() => { seed = matchingSeed; activeTab = 'explore'; calculateAll(); }}
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

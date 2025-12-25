<script lang="ts">
	import type { FilterRoot, FilterCondition } from '$lib/types/filters';
	import { createEmptyFilter, generateId, FILTER_PRESETS } from '$lib/types/filters';
	import FilterGroup from './FilterGroup.svelte';

	let { filter = $bindable(createEmptyFilter()), onSearch }: {
		filter?: FilterRoot;
		onSearch?: (filter: FilterRoot) => void;
	} = $props();

	function addCondition(type: FilterCondition['type']) {
		const newCondition = createDefaultCondition(type);
		filter.conditions = [...filter.conditions, newCondition];
	}

	function createDefaultCondition(type: FilterCondition['type']): FilterCondition {
		switch (type) {
			case 'daily_luck':
				return {
					type: 'daily_luck',
					daySpec: { type: 'exact', day: 1 },
					minLuck: 0.05,
				};
			case 'night_event':
				return {
					type: 'night_event',
					daySpec: { type: 'range', start: 1, end: 28 },
					eventType: 'fairy',
				};
			case 'cart_item':
				return {
					type: 'cart_item',
					daySpec: { type: 'cart_days' },
					itemId: 266, // Red Cabbage
				};
			case 'geode':
				return {
					type: 'geode',
					geodeNumber: 1,
					geodeType: 'omni',
					targetItems: [74], // Prismatic Shard
				};
			case 'dish_of_day':
				return {
					type: 'dish_of_day',
					daySpec: { type: 'exact', day: 1 },
					dishId: 194,
				};
			case 'weather':
				return {
					type: 'weather',
					daySpec: { type: 'exact', day: 3 },
					weatherType: 'rain',
				};
			case 'mine_floor':
				return {
					type: 'mine_floor',
					daySpec: { type: 'exact', day: 5 },
					floorRange: { start: 1, end: 50 },
					noMonsters: true,
					noDark: false,
				};
		}
	}

	function loadPreset(index: number) {
		const preset = FILTER_PRESETS[index];
		if (preset) {
			filter = { ...preset.filter, id: generateId() };
		}
	}

	function clearFilter() {
		filter = createEmptyFilter();
	}

	function handleSearch() {
		onSearch?.(filter);
	}
</script>

<div class="space-y-4">
	<!-- Presets -->
	<div class="flex flex-wrap gap-2">
		<span class="text-sm text-gray-500 py-1">Presets:</span>
		{#each FILTER_PRESETS as preset, i}
			<button
				onclick={() => loadPreset(i)}
				class="px-3 py-1 text-sm bg-amber-100 text-amber-800 rounded hover:bg-amber-200 transition-colors"
				title={preset.description}
			>
				{preset.name}
			</button>
		{/each}
	</div>

	<!-- Filter Tree -->
	<div class="border border-gray-200 rounded-lg p-4 bg-gray-50">
		<FilterGroup bind:group={filter} isRoot={true} />
	</div>

	<!-- Add Condition Buttons -->
	<div class="flex flex-wrap gap-2">
		<span class="text-sm text-gray-500 py-2">Add filter:</span>
		<button
			onclick={() => addCondition('daily_luck')}
			class="px-3 py-1 text-sm bg-green-100 text-green-800 rounded hover:bg-green-200 transition-colors"
		>
			+ Daily Luck
		</button>
		<button
			onclick={() => addCondition('night_event')}
			class="px-3 py-1 text-sm bg-purple-100 text-purple-800 rounded hover:bg-purple-200 transition-colors"
		>
			+ Night Event
		</button>
		<button
			onclick={() => addCondition('cart_item')}
			class="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded hover:bg-blue-200 transition-colors"
		>
			+ Cart Item
		</button>
		<button
			onclick={() => addCondition('geode')}
			class="px-3 py-1 text-sm bg-orange-100 text-orange-800 rounded hover:bg-orange-200 transition-colors"
		>
			+ Geode
		</button>
		<button
			onclick={() => addCondition('weather')}
			class="px-3 py-1 text-sm bg-sky-100 text-sky-800 rounded hover:bg-sky-200 transition-colors"
		>
			+ Weather
		</button>
		<button
			onclick={() => addCondition('mine_floor')}
			class="px-3 py-1 text-sm bg-stone-100 text-stone-800 rounded hover:bg-stone-200 transition-colors"
		>
			+ Mine Floors
		</button>
	</div>

	<!-- Actions -->
	<div class="flex gap-3">
		<button
			onclick={handleSearch}
			disabled={filter.conditions.length === 0}
			class="px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
		>
			Search Seeds
		</button>
		<button
			onclick={clearFilter}
			class="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
		>
			Clear All
		</button>
	</div>
</div>

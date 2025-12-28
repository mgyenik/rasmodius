<script lang="ts">
	import type { FilterCondition } from '$lib/types/filters';
	import { getItemName, ITEMS } from '$lib/data/items';
	import DaySpecEditor from './DaySpecEditor.svelte';

	let {
		condition = $bindable(),
	}: {
		condition: FilterCondition;
	} = $props();

	// Item search state
	let itemSearchQuery = $state('');
	let showItemDropdown = $state(false);

	// All sellable items (items with price > 0), sorted by name
	const ALL_ITEMS = Object.entries(ITEMS)
		.filter(([_, item]) => item.price > 0)
		.map(([id, item]) => ({ id: parseInt(id), name: item.name }))
		.sort((a, b) => a.name.localeCompare(b.name));

	// Filtered items based on search
	const filteredItems = $derived(
		itemSearchQuery.trim() === ''
			? ALL_ITEMS.slice(0, 50)
			: ALL_ITEMS.filter((item) =>
					item.name.toLowerCase().includes(itemSearchQuery.toLowerCase())
				).slice(0, 50)
	);

	// Popular geode targets
	const POPULAR_GEODE_ITEMS = [
		{ id: 74, name: 'Prismatic Shard' },
		{ id: 72, name: 'Diamond' },
		{ id: 60, name: 'Emerald' },
		{ id: 64, name: 'Ruby' },
		{ id: 62, name: 'Aquamarine' },
	];

	function selectItem(itemId: number) {
		if (condition.type === 'cart_item') {
			condition.itemId = itemId;
		}
		showItemDropdown = false;
		itemSearchQuery = '';
	}
</script>

{#if condition.type === 'daily_luck'}
	<!-- Daily Luck: [When v] [Season v] [Year] luck [min] to [max] -->
	<div class="flex flex-wrap items-center gap-2 text-sm">
		<span class="font-medium text-gray-700">Daily Luck</span>
		<DaySpecEditor bind:daySpec={condition.daySpec} />
		<span class="text-gray-500">luck</span>
		<input
			type="number"
			class="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
			bind:value={condition.minLuck}
			min="-0.1"
			max="0.1"
			step="0.01"
		/>
		<span class="text-gray-500">to</span>
		<input
			type="number"
			class="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
			bind:value={condition.maxLuck}
			min="-0.1"
			max="0.1"
			step="0.01"
		/>
	</div>
{:else if condition.type === 'night_event'}
	<!-- Night Event: [Event v] [When v] [params] -->
	<div class="flex flex-wrap items-center gap-2 text-sm">
		<span class="font-medium text-gray-700">Night Event</span>
		<select
			class="px-2 py-1 border border-gray-300 rounded text-sm"
			bind:value={condition.eventType}
		>
			<option value="fairy">Crop Fairy</option>
			<option value="witch">Witch</option>
			<option value="meteor">Meteorite</option>
			<option value="ufo">Strange Capsule</option>
			<option value="owl">Stone Owl</option>
			<option value="any">Any Event</option>
		</select>
		<DaySpecEditor bind:daySpec={condition.daySpec} />
	</div>
{:else if condition.type === 'cart_item'}
	<!-- Cart Item: [Item Button/Search] in [When v] [params] max [price] -->
	<div class="flex flex-wrap items-center gap-2 text-sm">
		<span class="font-medium text-gray-700">Cart Item</span>

		<!-- Item selector -->
		<div class="relative">
			{#if showItemDropdown}
				<input
					type="text"
					class="w-48 px-2 py-1 border border-gray-300 rounded text-sm"
					placeholder="Search items..."
					bind:value={itemSearchQuery}
					autofocus
				/>
				<div
					class="absolute z-10 w-64 mt-1 bg-white border border-gray-300 rounded shadow-lg max-h-48 overflow-y-auto"
				>
					{#each filteredItems as item}
						<button
							type="button"
							class="w-full px-2 py-1 text-left text-sm hover:bg-amber-50 {condition.itemId ===
							item.id
								? 'bg-amber-100'
								: ''}"
							onclick={() => selectItem(item.id)}
						>
							{item.name}
						</button>
					{/each}
					{#if filteredItems.length === 0}
						<div class="px-2 py-2 text-sm text-gray-400 italic">No items found</div>
					{/if}
				</div>
				<!-- Click outside to close -->
				<button
					type="button"
					class="fixed inset-0 z-0"
					onclick={() => (showItemDropdown = false)}
					aria-label="Close dropdown"
				></button>
			{:else}
				<button
					type="button"
					onclick={() => (showItemDropdown = true)}
					class="px-3 py-1 bg-amber-100 text-amber-800 rounded hover:bg-amber-200 transition-colors font-medium"
				>
					{getItemName(condition.itemId)}
				</button>
			{/if}
		</div>

		<span class="text-gray-500">in</span>
		<DaySpecEditor bind:daySpec={condition.daySpec} allowedTypes={['season', 'range']} />
		<span class="text-gray-500">max</span>
		<input
			type="number"
			class="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
			bind:value={condition.maxPrice}
			placeholder="any"
		/>
		<span class="text-gray-500">g</span>
	</div>
{:else if condition.type === 'geode'}
	<!-- Geode: [Type v] #[num] contains [item v] -->
	<div class="flex flex-wrap items-center gap-2 text-sm">
		<span class="font-medium text-gray-700">Geode</span>
		<select
			class="px-2 py-1 border border-gray-300 rounded text-sm"
			bind:value={condition.geodeType}
		>
			<option value="omni">Omni</option>
			<option value="geode">Regular</option>
			<option value="frozen">Frozen</option>
			<option value="magma">Magma</option>
			<option value="trove">Artifact Trove</option>
			<option value="coconut">Golden Coconut</option>
		</select>
		<span class="text-gray-500">#</span>
		<input
			type="number"
			class="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
			bind:value={condition.geodeNumber}
			min="1"
		/>
		<span class="text-gray-500">contains</span>
		<select
			class="px-2 py-1 border border-gray-300 rounded text-sm"
			value={condition.targetItems[0]}
			onchange={(e) => (condition.targetItems = [parseInt(e.currentTarget.value)])}
		>
			{#each POPULAR_GEODE_ITEMS as item}
				<option value={item.id}>{item.name}</option>
			{/each}
		</select>
	</div>
{:else if condition.type === 'weather'}
	<!-- Weather: [Type v] [When v] [params] -->
	<div class="flex flex-wrap items-center gap-2 text-sm">
		<span class="font-medium text-gray-700">Weather</span>
		<select
			class="px-2 py-1 border border-gray-300 rounded text-sm"
			bind:value={condition.weatherType}
		>
			<option value="rain">Rain</option>
			<option value="storm">Storm</option>
			<option value="sunny">Sunny</option>
			<option value="windy">Windy</option>
			<option value="snow">Snow</option>
			<option value="any">Any (not sunny)</option>
		</select>
		<DaySpecEditor bind:daySpec={condition.daySpec} />
	</div>
{:else if condition.type === 'mine_floor'}
	<!-- Mine Floor: floors [start] to [end] [when v] [params] | checkboxes -->
	<div class="space-y-2">
		<div class="flex flex-wrap items-center gap-2 text-sm">
			<span class="font-medium text-gray-700">Mine</span>
			<span class="text-gray-500">floors</span>
			<input
				type="number"
				class="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
				bind:value={condition.floorRange.start}
				min="1"
				max="120"
			/>
			<span class="text-gray-500">to</span>
			<input
				type="number"
				class="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
				bind:value={condition.floorRange.end}
				min="1"
				max="120"
			/>
			<DaySpecEditor bind:daySpec={condition.daySpec} />
		</div>
		<div class="flex flex-wrap gap-4 text-sm">
			<label class="flex items-center gap-1.5">
				<input
					type="checkbox"
					bind:checked={condition.noMonsters}
					class="rounded border-gray-300"
				/>
				<span class="text-gray-700">No monsters</span>
			</label>
			<label class="flex items-center gap-1.5">
				<input type="checkbox" bind:checked={condition.noDark} class="rounded border-gray-300" />
				<span class="text-gray-700">No dark</span>
			</label>
			<label class="flex items-center gap-1.5">
				<input
					type="checkbox"
					bind:checked={condition.hasMushroom}
					class="rounded border-gray-300"
				/>
				<span class="text-gray-700">Has mushroom (81+)</span>
			</label>
		</div>
	</div>
{/if}

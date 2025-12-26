<script lang="ts">
	import type { FilterCondition, DaySpec } from '$lib/types/filters';
	import { getConditionLabel, getDaySpecLabel } from '$lib/types/filters';
	import { getItemName, ITEMS } from '$lib/data/items';

	let { condition = $bindable() }: {
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
			? ALL_ITEMS.slice(0, 50) // Show first 50 when no search
			: ALL_ITEMS.filter(item =>
				item.name.toLowerCase().includes(itemSearchQuery.toLowerCase())
			).slice(0, 50)
	);

	// Common items for cart search (shown as quick picks)
	const POPULAR_CART_ITEMS = [
		{ id: 266, name: 'Red Cabbage' },
		{ id: 417, name: 'Sweet Gem Berry' },
		{ id: 347, name: 'Rare Seed' },
		{ id: 433, name: 'Coffee Bean' },
		{ id: 621, name: 'Quality Sprinkler' },
		{ id: 645, name: 'Iridium Sprinkler' },
	];

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

	function updateDaySpecType(type: DaySpec['type']) {
		if (condition.type === 'daily_luck' || condition.type === 'night_event' || condition.type === 'cart_item' || condition.type === 'dish_of_day' || condition.type === 'weather' || condition.type === 'mine_floor') {
			switch (type) {
				case 'exact':
					condition.daySpec = { type: 'exact', day: 1 };
					break;
				case 'range':
					condition.daySpec = { type: 'range', start: 1, end: 28 };
					break;
				case 'season':
					condition.daySpec = { type: 'season', season: 0, year: 1 };
					break;
				case 'any':
					condition.daySpec = { type: 'any' };
					break;
			}
		}
	}
</script>

<div class="space-y-3">
	<div class="flex items-center gap-2">
		<span class="text-sm font-medium text-gray-700">{getConditionLabel(condition)}</span>
	</div>

	{#if condition.type === 'daily_luck'}
		<!-- Daily Luck Editor -->
		<div class="grid grid-cols-2 gap-3">
			<div>
				<label class="block text-xs text-gray-500 mb-1">When</label>
				<select
					class="w-full px-2 py-1 text-sm border border-gray-300 rounded"
					value={condition.daySpec.type}
					onchange={(e) => updateDaySpecType(e.currentTarget.value as DaySpec['type'])}
				>
					<option value="exact">Specific Day</option>
					<option value="range">Day Range</option>
					<option value="season">Season</option>
					<option value="any">Any Day</option>
				</select>
			</div>
			{#if condition.daySpec.type === 'exact'}
				<div>
					<label class="block text-xs text-gray-500 mb-1">Day</label>
					<input
						type="number"
						class="w-full px-2 py-1 text-sm border border-gray-300 rounded"
						bind:value={condition.daySpec.day}
						min="1"
					/>
				</div>
			{:else if condition.daySpec.type === 'range'}
				<div class="flex gap-2">
					<div class="flex-1">
						<label class="block text-xs text-gray-500 mb-1">From</label>
						<input
							type="number"
							class="w-full px-2 py-1 text-sm border border-gray-300 rounded"
							bind:value={condition.daySpec.start}
							min="1"
						/>
					</div>
					<div class="flex-1">
						<label class="block text-xs text-gray-500 mb-1">To</label>
						<input
							type="number"
							class="w-full px-2 py-1 text-sm border border-gray-300 rounded"
							bind:value={condition.daySpec.end}
							min="1"
						/>
					</div>
				</div>
			{:else if condition.daySpec.type === 'season'}
				<div class="flex gap-2">
					<div class="flex-1">
						<label class="block text-xs text-gray-500 mb-1">Season</label>
						<select
							class="w-full px-2 py-1 text-sm border border-gray-300 rounded"
							bind:value={condition.daySpec.season}
						>
							<option value={0}>Spring</option>
							<option value={1}>Summer</option>
							<option value={2}>Fall</option>
							<option value={3}>Winter</option>
						</select>
					</div>
					<div class="flex-1">
						<label class="block text-xs text-gray-500 mb-1">Year</label>
						<input
							type="number"
							class="w-full px-2 py-1 text-sm border border-gray-300 rounded"
							bind:value={condition.daySpec.year}
							min="1"
						/>
					</div>
				</div>
			{/if}
		</div>
		<div class="grid grid-cols-2 gap-3">
			<div>
				<label class="block text-xs text-gray-500 mb-1">Min Luck</label>
				<input
					type="number"
					class="w-full px-2 py-1 text-sm border border-gray-300 rounded"
					bind:value={condition.minLuck}
					min="-0.1"
					max="0.1"
					step="0.01"
				/>
			</div>
			<div>
				<label class="block text-xs text-gray-500 mb-1">Max Luck</label>
				<input
					type="number"
					class="w-full px-2 py-1 text-sm border border-gray-300 rounded"
					bind:value={condition.maxLuck}
					min="-0.1"
					max="0.1"
					step="0.01"
				/>
			</div>
		</div>

	{:else if condition.type === 'night_event'}
		<!-- Night Event Editor -->
		<div class="grid grid-cols-2 gap-3">
			<div>
				<label class="block text-xs text-gray-500 mb-1">Event Type</label>
				<select
					class="w-full px-2 py-1 text-sm border border-gray-300 rounded"
					bind:value={condition.eventType}
				>
					<option value="fairy">Crop Fairy</option>
					<option value="witch">Witch</option>
					<option value="meteor">Meteorite</option>
					<option value="ufo">Strange Capsule</option>
					<option value="owl">Stone Owl</option>
					<option value="any">Any Event</option>
				</select>
			</div>
			<div>
				<label class="block text-xs text-gray-500 mb-1">When</label>
				<select
					class="w-full px-2 py-1 text-sm border border-gray-300 rounded"
					value={condition.daySpec.type}
					onchange={(e) => updateDaySpecType(e.currentTarget.value as DaySpec['type'])}
				>
					<option value="exact">Specific Day</option>
					<option value="range">Day Range</option>
					<option value="season">Season</option>
					<option value="any">Any Day</option>
				</select>
			</div>
		</div>
		{#if condition.daySpec.type === 'exact'}
			<div>
				<label class="block text-xs text-gray-500 mb-1">Day</label>
				<input
					type="number"
					class="w-full px-2 py-1 text-sm border border-gray-300 rounded"
					bind:value={condition.daySpec.day}
					min="1"
				/>
			</div>
		{:else if condition.daySpec.type === 'range'}
			<div class="grid grid-cols-2 gap-3">
				<div>
					<label class="block text-xs text-gray-500 mb-1">From Day</label>
					<input
						type="number"
						class="w-full px-2 py-1 text-sm border border-gray-300 rounded"
						bind:value={condition.daySpec.start}
						min="1"
					/>
				</div>
				<div>
					<label class="block text-xs text-gray-500 mb-1">To Day</label>
					<input
						type="number"
						class="w-full px-2 py-1 text-sm border border-gray-300 rounded"
						bind:value={condition.daySpec.end}
						min="1"
					/>
				</div>
			</div>
		{:else if condition.daySpec.type === 'season'}
			<div class="grid grid-cols-2 gap-3">
				<div>
					<label class="block text-xs text-gray-500 mb-1">Season</label>
					<select
						class="w-full px-2 py-1 text-sm border border-gray-300 rounded"
						bind:value={condition.daySpec.season}
					>
						<option value={0}>Spring</option>
						<option value={1}>Summer</option>
						<option value={2}>Fall</option>
						<option value={3}>Winter</option>
					</select>
				</div>
				<div>
					<label class="block text-xs text-gray-500 mb-1">Year</label>
					<input
						type="number"
						class="w-full px-2 py-1 text-sm border border-gray-300 rounded"
						bind:value={condition.daySpec.year}
						min="1"
					/>
				</div>
			</div>
		{/if}

	{:else if condition.type === 'cart_item'}
		<!-- Cart Item Editor -->
		<div class="space-y-3">
			<!-- Item Picker with Search -->
			<div>
				<label class="block text-xs text-gray-500 mb-1">Item</label>
				<div class="relative">
					<input
						type="text"
						class="w-full px-2 py-1 text-sm border border-gray-300 rounded"
						placeholder="Search items..."
						bind:value={itemSearchQuery}
						onfocus={() => showItemDropdown = true}
					/>
					{#if condition.itemId}
						<div class="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500">
							{getItemName(condition.itemId)}
						</div>
					{/if}
					{#if showItemDropdown}
						<div class="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded shadow-lg max-h-48 overflow-y-auto">
							<!-- Quick picks -->
							<div class="px-2 py-1 text-xs text-gray-400 bg-gray-50">Popular</div>
							{#each POPULAR_CART_ITEMS as item}
								<button
									type="button"
									class="w-full px-2 py-1 text-left text-sm hover:bg-amber-50 {condition.itemId === item.id ? 'bg-amber-100' : ''}"
									onclick={() => selectItem(item.id)}
								>
									{item.name}
								</button>
							{/each}
							<div class="px-2 py-1 text-xs text-gray-400 bg-gray-50 border-t">
								{itemSearchQuery ? 'Search Results' : 'All Items'}
							</div>
							{#each filteredItems as item}
								<button
									type="button"
									class="w-full px-2 py-1 text-left text-sm hover:bg-amber-50 {condition.itemId === item.id ? 'bg-amber-100' : ''}"
									onclick={() => selectItem(item.id)}
								>
									{item.name}
								</button>
							{/each}
							{#if filteredItems.length === 0}
								<div class="px-2 py-2 text-sm text-gray-400 italic">No items found</div>
							{/if}
						</div>
					{/if}
				</div>
				<!-- Close dropdown when clicking outside -->
				{#if showItemDropdown}
					<button
						type="button"
						class="fixed inset-0 z-0"
						onclick={() => showItemDropdown = false}
						aria-label="Close dropdown"
					></button>
				{/if}
			</div>

			<!-- When selector -->
			<div>
				<label class="block text-xs text-gray-500 mb-1">When</label>
				<select
					class="w-full px-2 py-1 text-sm border border-gray-300 rounded"
					value={condition.daySpec.type}
					onchange={(e) => updateDaySpecType(e.currentTarget.value as DaySpec['type'])}
				>
					<option value="season">Season</option>
					<option value="range">Day Range</option>
				</select>
			</div>

			<!-- Day spec options -->
			{#if condition.daySpec.type === 'season'}
				<div class="grid grid-cols-2 gap-3">
					<div>
						<label class="block text-xs text-gray-500 mb-1">Season</label>
						<select
							class="w-full px-2 py-1 text-sm border border-gray-300 rounded"
							bind:value={condition.daySpec.season}
						>
							<option value={0}>Spring</option>
							<option value={1}>Summer</option>
							<option value={2}>Fall</option>
							<option value={3}>Winter</option>
						</select>
					</div>
					<div>
						<label class="block text-xs text-gray-500 mb-1">Year</label>
						<input
							type="number"
							class="w-full px-2 py-1 text-sm border border-gray-300 rounded"
							bind:value={condition.daySpec.year}
							min="1"
						/>
					</div>
				</div>
			{:else if condition.daySpec.type === 'range'}
				<div class="grid grid-cols-2 gap-3">
					<div>
						<label class="block text-xs text-gray-500 mb-1">From Day</label>
						<input
							type="number"
							class="w-full px-2 py-1 text-sm border border-gray-300 rounded"
							bind:value={condition.daySpec.start}
							min="1"
						/>
					</div>
					<div>
						<label class="block text-xs text-gray-500 mb-1">To Day</label>
						<input
							type="number"
							class="w-full px-2 py-1 text-sm border border-gray-300 rounded"
							bind:value={condition.daySpec.end}
							min="1"
						/>
					</div>
				</div>
				<p class="text-xs text-gray-400">Note: Cart only appears on Fri/Sun (days 5, 7, 12, 14...)</p>
			{/if}

			<div>
				<label class="block text-xs text-gray-500 mb-1">Max Price (optional)</label>
				<input
					type="number"
					class="w-full px-2 py-1 text-sm border border-gray-300 rounded"
					bind:value={condition.maxPrice}
					placeholder="Any price"
				/>
			</div>
		</div>

	{:else if condition.type === 'geode'}
		<!-- Geode Editor -->
		<div class="grid grid-cols-2 gap-3">
			<div>
				<label class="block text-xs text-gray-500 mb-1">Geode Type</label>
				<select
					class="w-full px-2 py-1 text-sm border border-gray-300 rounded"
					bind:value={condition.geodeType}
				>
					<option value="omni">Omni Geode</option>
					<option value="geode">Geode</option>
					<option value="frozen">Frozen Geode</option>
					<option value="magma">Magma Geode</option>
					<option value="trove">Artifact Trove</option>
					<option value="coconut">Golden Coconut</option>
				</select>
			</div>
			<div>
				<label class="block text-xs text-gray-500 mb-1">Geode #</label>
				<input
					type="number"
					class="w-full px-2 py-1 text-sm border border-gray-300 rounded"
					bind:value={condition.geodeNumber}
					min="1"
				/>
			</div>
		</div>
		<div>
			<label class="block text-xs text-gray-500 mb-1">Target Item</label>
			<select
				class="w-full px-2 py-1 text-sm border border-gray-300 rounded"
				value={condition.targetItems[0]}
				onchange={(e) => condition.targetItems = [parseInt(e.currentTarget.value)]}
			>
				{#each POPULAR_GEODE_ITEMS as item}
					<option value={item.id}>{item.name}</option>
				{/each}
			</select>
		</div>
	{:else if condition.type === 'weather'}
		<!-- Weather Editor -->
		<div class="grid grid-cols-2 gap-3">
			<div>
				<label class="block text-xs text-gray-500 mb-1">Weather Type</label>
				<select
					class="w-full px-2 py-1 text-sm border border-gray-300 rounded"
					bind:value={condition.weatherType}
				>
					<option value="rain">Rain</option>
					<option value="storm">Storm</option>
					<option value="sunny">Sunny</option>
					<option value="windy">Windy</option>
					<option value="snow">Snow</option>
					<option value="any">Any (not sunny)</option>
				</select>
			</div>
			<div>
				<label class="block text-xs text-gray-500 mb-1">When</label>
				<select
					class="w-full px-2 py-1 text-sm border border-gray-300 rounded"
					value={condition.daySpec.type}
					onchange={(e) => updateDaySpecType(e.currentTarget.value as DaySpec['type'])}
				>
					<option value="exact">Specific day</option>
					<option value="range">Day range</option>
					<option value="season">Season</option>
					<option value="any">Any day</option>
				</select>
			</div>
		</div>
		{#if condition.daySpec.type === 'exact'}
			<div>
				<label class="block text-xs text-gray-500 mb-1">Day</label>
				<input
					type="number"
					class="w-full px-2 py-1 text-sm border border-gray-300 rounded"
					bind:value={condition.daySpec.day}
					min="1"
				/>
			</div>
		{:else if condition.daySpec.type === 'range'}
			<div class="grid grid-cols-2 gap-3">
				<div>
					<label class="block text-xs text-gray-500 mb-1">From Day</label>
					<input
						type="number"
						class="w-full px-2 py-1 text-sm border border-gray-300 rounded"
						bind:value={condition.daySpec.start}
						min="1"
					/>
				</div>
				<div>
					<label class="block text-xs text-gray-500 mb-1">To Day</label>
					<input
						type="number"
						class="w-full px-2 py-1 text-sm border border-gray-300 rounded"
						bind:value={condition.daySpec.end}
						min="1"
					/>
				</div>
			</div>
		{:else if condition.daySpec.type === 'season'}
			<div class="grid grid-cols-2 gap-3">
				<div>
					<label class="block text-xs text-gray-500 mb-1">Season</label>
					<select
						class="w-full px-2 py-1 text-sm border border-gray-300 rounded"
						bind:value={condition.daySpec.season}
					>
						<option value={0}>Spring</option>
						<option value={1}>Summer</option>
						<option value={2}>Fall</option>
						<option value={3}>Winter</option>
					</select>
				</div>
				<div>
					<label class="block text-xs text-gray-500 mb-1">Year</label>
					<input
						type="number"
						class="w-full px-2 py-1 text-sm border border-gray-300 rounded"
						bind:value={condition.daySpec.year}
						min="1"
					/>
				</div>
			</div>
		{/if}
	{:else if condition.type === 'mine_floor'}
		<!-- Mine Floor Editor -->
		<div class="grid grid-cols-2 gap-3">
			<div>
				<label class="block text-xs text-gray-500 mb-1">When</label>
				<select
					class="w-full px-2 py-1 text-sm border border-gray-300 rounded"
					value={condition.daySpec.type}
					onchange={(e) => updateDaySpecType(e.currentTarget.value as DaySpec['type'])}
				>
					<option value="exact">Specific Day</option>
					<option value="range">Day Range</option>
					<option value="season">Season</option>
					<option value="any">Any Day</option>
				</select>
			</div>
			{#if condition.daySpec.type === 'exact'}
				<div>
					<label class="block text-xs text-gray-500 mb-1">Day</label>
					<input
						type="number"
						class="w-full px-2 py-1 text-sm border border-gray-300 rounded"
						bind:value={condition.daySpec.day}
						min="1"
					/>
				</div>
			{:else if condition.daySpec.type === 'range'}
				<div class="flex gap-2">
					<div class="flex-1">
						<label class="block text-xs text-gray-500 mb-1">From</label>
						<input
							type="number"
							class="w-full px-2 py-1 text-sm border border-gray-300 rounded"
							bind:value={condition.daySpec.start}
							min="1"
						/>
					</div>
					<div class="flex-1">
						<label class="block text-xs text-gray-500 mb-1">To</label>
						<input
							type="number"
							class="w-full px-2 py-1 text-sm border border-gray-300 rounded"
							bind:value={condition.daySpec.end}
							min="1"
						/>
					</div>
				</div>
			{:else if condition.daySpec.type === 'season'}
				<div class="flex gap-2">
					<div class="flex-1">
						<label class="block text-xs text-gray-500 mb-1">Season</label>
						<select
							class="w-full px-2 py-1 text-sm border border-gray-300 rounded"
							bind:value={condition.daySpec.season}
						>
							<option value={0}>Spring</option>
							<option value={1}>Summer</option>
							<option value={2}>Fall</option>
							<option value={3}>Winter</option>
						</select>
					</div>
					<div class="flex-1">
						<label class="block text-xs text-gray-500 mb-1">Year</label>
						<input
							type="number"
							class="w-full px-2 py-1 text-sm border border-gray-300 rounded"
							bind:value={condition.daySpec.year}
							min="1"
						/>
					</div>
				</div>
			{/if}
		</div>
		<div class="grid grid-cols-2 gap-3">
			<div>
				<label class="block text-xs text-gray-500 mb-1">Start Floor</label>
				<input
					type="number"
					class="w-full px-2 py-1 text-sm border border-gray-300 rounded"
					bind:value={condition.floorRange.start}
					min="1"
					max="120"
				/>
			</div>
			<div>
				<label class="block text-xs text-gray-500 mb-1">End Floor</label>
				<input
					type="number"
					class="w-full px-2 py-1 text-sm border border-gray-300 rounded"
					bind:value={condition.floorRange.end}
					min="1"
					max="120"
				/>
			</div>
		</div>
		<div class="space-y-2">
			<label class="flex items-center gap-2">
				<input
					type="checkbox"
					bind:checked={condition.noMonsters}
					class="rounded border-gray-300"
				/>
				<span class="text-sm text-gray-700">No monster floors in range</span>
			</label>
			<label class="flex items-center gap-2">
				<input
					type="checkbox"
					bind:checked={condition.noDark}
					class="rounded border-gray-300"
				/>
				<span class="text-sm text-gray-700">No dark floors in range</span>
			</label>
			<label class="flex items-center gap-2">
				<input
					type="checkbox"
					bind:checked={condition.hasMushroom}
					class="rounded border-gray-300"
				/>
				<span class="text-sm text-gray-700">Has mushroom floor (floors 81+)</span>
			</label>
		</div>
	{/if}
</div>

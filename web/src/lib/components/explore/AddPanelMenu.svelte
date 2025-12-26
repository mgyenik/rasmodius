<script lang="ts">
	import type { ExplorePanel } from '$lib/types/explorePanels';
	import {
		createCartPanel,
		createNightEventsPanel,
		createDailyLuckPanel,
		createWeatherPanel,
		createGeodesPanel,
		createMineFloorsPanel,
		createDishPanel
	} from '$lib/types/explorePanels';

	let { onAdd }: { onAdd: (panel: ExplorePanel) => void } = $props();

	let isOpen = $state(false);

	const panelOptions = [
		{ label: 'Daily Luck', icon: '🍀', create: () => createDailyLuckPanel() },
		{ label: 'Weather', icon: '☀️', create: () => createWeatherPanel() },
		{ label: 'Night Events', icon: '🧚', create: () => createNightEventsPanel() },
		{ label: 'Traveling Cart', icon: '🛒', create: () => createCartPanel() },
		{ label: 'Dish of the Day', icon: '🍲', create: () => createDishPanel() },
		{ label: 'Omni Geodes', icon: '💎', create: () => createGeodesPanel('omni') },
		{ label: 'Regular Geodes', icon: '🪨', create: () => createGeodesPanel('geode') },
		{ label: 'Frozen Geodes', icon: '🧊', create: () => createGeodesPanel('frozen') },
		{ label: 'Magma Geodes', icon: '🔥', create: () => createGeodesPanel('magma') },
		{ label: 'Artifact Troves', icon: '📜', create: () => createGeodesPanel('trove') },
		{ label: 'Golden Coconuts', icon: '🥥', create: () => createGeodesPanel('coconut') },
		{ label: 'Mine Floors', icon: '⛏️', create: () => createMineFloorsPanel() }
	];

	function handleAdd(create: () => ExplorePanel) {
		onAdd(create());
		isOpen = false;
	}

	function handleClickOutside(event: MouseEvent) {
		const target = event.target as HTMLElement;
		if (!target.closest('.add-panel-menu')) {
			isOpen = false;
		}
	}
</script>

<svelte:window onclick={handleClickOutside} />

<div class="add-panel-menu relative inline-block">
	<button
		class="flex items-center gap-2 px-4 py-2 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-lg font-medium transition-colors"
		onclick={() => (isOpen = !isOpen)}
	>
		<span class="text-lg">+</span>
		<span>Add Panel</span>
	</button>

	{#if isOpen}
		<div
			class="absolute top-full left-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50 py-1"
		>
			{#each panelOptions as option}
				<button
					class="w-full px-3 py-2 text-left text-sm hover:bg-amber-50 flex items-center gap-2 transition-colors"
					onclick={() => handleAdd(option.create)}
				>
					<span>{option.icon}</span>
					<span>{option.label}</span>
				</button>
			{/each}
		</div>
	{/if}
</div>

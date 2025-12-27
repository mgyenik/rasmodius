<script lang="ts">
	import type { ExplorePanel, ExploreState } from '$lib/types/explorePanels';
	import { createDefaultExploreState } from '$lib/types/explorePanels';
	import PanelContainer from './PanelContainer.svelte';
	import AddPanelMenu from './AddPanelMenu.svelte';
	import DailyLuckPanel from './panels/DailyLuckPanel.svelte';
	import WeatherPanel from './panels/WeatherPanel.svelte';
	import NightEventsPanel from './panels/NightEventsPanel.svelte';
	import CartPanel from './panels/CartPanel.svelte';
	import DishPanel from './panels/DishPanel.svelte';
	import GeodesPanel from './panels/GeodesPanel.svelte';
	import MineFloorsPanel from './panels/MineFloorsPanel.svelte';

	type WasmModule = typeof import('rasmodius');

	let {
		seed = $bindable(1),
		panels = $bindable<ExplorePanel[]>([]),
		version,
		wasm,
		onCopyLink,
		copySuccess = false,
		onAddPanel,
		onRemovePanel,
		onUpdatePanel,
		onSeedChange
	}: {
		seed: number;
		panels: ExplorePanel[];
		version: string;
		wasm: WasmModule | null;
		onCopyLink?: () => void;
		copySuccess?: boolean;
		onAddPanel?: (panel: ExplorePanel) => void;
		onRemovePanel?: (panelId: string) => void;
		onUpdatePanel?: (updated: ExplorePanel) => void;
		onSeedChange?: () => void;
	} = $props();

	function handleRemovePanel(panelId: string) {
		// Call parent callback which handles both state update and URL push
		onRemovePanel?.(panelId);
	}

	function handleUpdatePanel(updated: ExplorePanel) {
		// Call parent callback which handles both state update and URL push
		onUpdatePanel?.(updated);
	}

	function handleAddPanel(panel: ExplorePanel) {
		// Call parent callback which handles both state update and URL push
		onAddPanel?.(panel);
	}

	function handleSeedInput() {
		// Notify parent of seed change for debounced URL update
		onSeedChange?.();
	}
</script>

<div class="space-y-4">
	<!-- Seed input -->
	<div class="flex flex-wrap items-center gap-4">
		<div class="flex items-center gap-2">
			<label for="explore-seed" class="text-sm font-medium text-gray-700">Seed:</label>
			<input
				id="explore-seed"
				type="number"
				bind:value={seed}
				oninput={handleSeedInput}
				class="w-32 px-2 py-1 border border-gray-300 rounded text-sm"
			/>
		</div>
		{#if onCopyLink}
			<button
				class="px-3 py-1 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded text-sm font-medium transition-colors"
				onclick={onCopyLink}
			>
				{copySuccess ? 'Copied!' : 'Copy Link to This Seed'}
			</button>
		{/if}
	</div>

	<!-- Panels grid -->
	{#if wasm}
		<div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
			{#each panels as panel (panel.id)}
				<PanelContainer {panel} onRemove={() => handleRemovePanel(panel.id)} onUpdate={handleUpdatePanel}>
					{#if panel.type === 'daily_luck'}
						<DailyLuckPanel {panel} {seed} {wasm} />
					{:else if panel.type === 'weather'}
						<WeatherPanel {panel} {seed} {version} {wasm} />
					{:else if panel.type === 'night_events'}
						<NightEventsPanel {panel} {seed} {version} {wasm} />
					{:else if panel.type === 'cart'}
						<CartPanel {panel} {seed} {version} {wasm} />
					{:else if panel.type === 'dish'}
						<DishPanel {panel} {seed} {wasm} />
					{:else if panel.type === 'geodes'}
						<GeodesPanel {panel} {seed} {version} {wasm} />
					{:else if panel.type === 'mine_floors'}
						<MineFloorsPanel {panel} {seed} {version} {wasm} />
					{/if}
				</PanelContainer>
			{/each}
		</div>

		<!-- Add panel button -->
		<div class="flex justify-center">
			<AddPanelMenu onAdd={handleAddPanel} />
		</div>
	{:else}
		<div class="text-center text-gray-500 py-8">Loading WASM module...</div>
	{/if}
</div>

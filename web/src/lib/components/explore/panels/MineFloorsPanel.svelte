<script lang="ts">
	import type { MineFloorsPanel, MineFloorHighlight } from '$lib/types/explorePanels';

	type FloorPrediction = {
		floor: number;
		is_monster_floor: boolean;
		is_dark_floor: boolean;
		is_mushroom_floor: boolean;
	};
	type WasmModule = {
		predict_mine_floors: (
			seed: number,
			day: number,
			startFloor: number,
			endFloor: number,
			version: string
		) => FloorPrediction[];
	};

	let {
		panel,
		seed,
		version,
		wasm,
	}: {
		panel: MineFloorsPanel;
		seed: number;
		version: string;
		wasm: WasmModule;
	} = $props();

	let result = $derived.by(() => {
		if (!wasm) return { data: [] as FloorPrediction[], error: null as string | null };
		try {
			const data = wasm.predict_mine_floors(
				seed,
				panel.day,
				panel.floorRange.start,
				panel.floorRange.end,
				version
			);
			return { data, error: null };
		} catch (e) {
			console.error('WASM prediction failed:', e);
			return { data: [] as FloorPrediction[], error: String(e) };
		}
	});

	let floorData = $derived(result.data);
	let wasmError = $derived(result.error);

	// Group floors into ranges of 10 for display
	let floorGroups = $derived.by(() => {
		const groups: FloorPrediction[][] = [];
		for (let i = 0; i < floorData.length; i += 10) {
			groups.push(floorData.slice(i, i + 10));
		}
		return groups;
	});

	/** Check if a floor matches any of the highlight criteria */
	function isHighlighted(floor: FloorPrediction): boolean {
		if (!panel.highlights) return false;
		return panel.highlights.some((h: MineFloorHighlight) => {
			// Check if this floor is in the target list
			if (!h.floors.includes(floor.floor)) return false;
			// Check mushroom criteria
			if (h.hasMushroom && floor.is_mushroom_floor) return true;
			return false;
		});
	}

	function getFloorClass(floor: FloorPrediction): string {
		if (floor.is_mushroom_floor) return 'bg-amber-100 text-amber-800';
		if (floor.is_monster_floor) return 'bg-red-100 text-red-800';
		if (floor.is_dark_floor) return 'bg-gray-300 text-gray-800';
		return 'bg-gray-50 text-gray-600';
	}

	function getFloorIcon(floor: FloorPrediction): string {
		if (floor.is_mushroom_floor) return '🍄';
		if (floor.is_monster_floor) return '👹';
		if (floor.is_dark_floor) return '🌑';
		return '';
	}

	function getFloorTitle(floor: FloorPrediction): string {
		const traits: string[] = [];
		if (floor.is_mushroom_floor) traits.push('Mushroom');
		if (floor.is_monster_floor) traits.push('Monster');
		if (floor.is_dark_floor) traits.push('Dark');
		return traits.length > 0
			? `Floor ${floor.floor}: ${traits.join(', ')}`
			: `Floor ${floor.floor}`;
	}
</script>

{#if !wasm}
	<div class="animate-pulse bg-gray-100 h-20 rounded"></div>
{:else if wasmError}
	<div class="text-red-600 text-sm p-2 bg-red-50 rounded">Failed to load floor data</div>
{:else}
	<div class="space-y-1">
		{#each floorGroups as group, gi (gi)}
			<div class="flex gap-0.5">
				{#each group as floor (floor.floor)}
					{@const highlighted = isHighlighted(floor)}
					<div
						class="w-7 h-7 flex items-center justify-center rounded text-xs font-medium transition-all {getFloorClass(
							floor
						)}
						{highlighted ? 'ring-2 ring-emerald-400 ring-offset-1 shadow-md' : ''}"
						title="{getFloorTitle(floor)}{highlighted ? ' (matches filter)' : ''}"
					>
						{#if getFloorIcon(floor)}
							<span class="text-sm">{getFloorIcon(floor)}</span>
						{:else}
							{floor.floor}
						{/if}
					</div>
				{/each}
			</div>
		{/each}
	</div>

	<div class="flex gap-3 mt-2 text-xs text-gray-500">
		<span><span class="inline-block w-3 h-3 bg-red-100 rounded mr-1"></span>Monster</span>
		<span><span class="inline-block w-3 h-3 bg-gray-300 rounded mr-1"></span>Dark</span>
		<span><span class="inline-block w-3 h-3 bg-amber-100 rounded mr-1"></span>Mushroom</span>
	</div>
{/if}

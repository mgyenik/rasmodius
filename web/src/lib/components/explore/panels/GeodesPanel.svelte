<script lang="ts">
	import type { GeodesPanel, GeodeHighlight } from '$lib/types/explorePanels';
	import { getItemName } from '$lib/data/items';

	type GeodeResult = { item_id: number; quantity: number };
	type WasmModule = {
		predict_geodes: (
			seed: number,
			start: number,
			count: number,
			geodeType: string,
			version: string
		) => GeodeResult[];
	};

	let {
		panel,
		seed,
		version,
		wasm
	}: {
		panel: GeodesPanel;
		seed: number;
		version: string;
		wasm: WasmModule;
	} = $props();

	let geodeData: GeodeResult[] = $derived.by(() => {
		if (!wasm) return [];
		const count = panel.geodeRange.end - panel.geodeRange.start + 1;
		return wasm.predict_geodes(seed, panel.geodeRange.start, count, panel.geodeType, version);
	});

	function isValuable(itemId: number): boolean {
		// Prismatic shard, diamonds, and other valuable items
		return [74, 72, 60, 62, 64, 66, 68, 70].includes(itemId);
	}

	/** Check if a geode slot matches any of the highlight criteria */
	function isHighlighted(geodeNum: number, itemId: number): boolean {
		if (!panel.highlights) return false;
		return panel.highlights.some((h: GeodeHighlight) => {
			// Check if this geode number is in the target list (or if no specific numbers, check all)
			const geodeMatches = h.geodeNumbers.length === 0 || h.geodeNumbers.includes(geodeNum);
			// Check if this item is in the target items
			const itemMatches = h.targetItems.includes(itemId);
			return geodeMatches && itemMatches;
		});
	}

	function getGeodeTypeLabel(): string {
		switch (panel.geodeType) {
			case 'geode':
				return 'Regular';
			case 'frozen':
				return 'Frozen';
			case 'magma':
				return 'Magma';
			case 'omni':
				return 'Omni';
			case 'trove':
				return 'Artifact Trove';
			case 'coconut':
				return 'Golden Coconut';
			default:
				return panel.geodeType;
		}
	}
</script>

<div class="space-y-1">
	{#each geodeData as result, i}
		{@const geodeNum = panel.geodeRange.start + i}
		{@const highlighted = isHighlighted(geodeNum, result.item_id)}
		{@const valuable = isValuable(result.item_id)}
		<div
			class="flex items-center gap-2 text-sm rounded px-1 py-0.5 transition-all
				{highlighted
					? 'bg-emerald-100 ring-2 ring-emerald-400 ring-offset-1 shadow-sm'
					: valuable
						? 'bg-purple-50'
						: 'bg-gray-50'}"
		>
			<span class="font-mono text-gray-500 w-6 text-right">#{geodeNum}</span>
			<span class="{highlighted ? 'text-emerald-800 font-semibold' : valuable ? 'text-purple-700 font-medium' : 'text-gray-700'}">
				{getItemName(result.item_id)}
			</span>
			{#if result.quantity > 1}
				<span class="{highlighted ? 'text-emerald-600' : 'text-gray-500'} text-xs">x{result.quantity}</span>
			{/if}
		</div>
	{/each}
</div>

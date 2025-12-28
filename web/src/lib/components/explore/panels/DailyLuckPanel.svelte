<script lang="ts">
	import type { DailyLuckPanel, LuckHighlight } from '$lib/types/explorePanels';

	type LuckData = { day: number; luck: number };
	type WasmModule = {
		predict_luck_range: (seed: number, start: number, end: number) => LuckData[];
	};

	let {
		panel,
		seed,
		wasm,
	}: {
		panel: DailyLuckPanel;
		seed: number;
		wasm: WasmModule;
	} = $props();

	let result = $derived.by(() => {
		if (!wasm) return { data: [] as LuckData[], error: null as string | null };
		try {
			const data = wasm.predict_luck_range(seed, panel.dayRange.start, panel.dayRange.end);
			return { data, error: null };
		} catch (e) {
			console.error('WASM prediction failed:', e);
			return { data: [] as LuckData[], error: String(e) };
		}
	});

	let luckData = $derived(result.data);
	let wasmError = $derived(result.error);

	function getLuckColor(luck: number): string {
		if (luck >= 0.07) return 'text-green-600 bg-green-50';
		if (luck >= 0.04) return 'text-green-500 bg-green-50/50';
		if (luck >= 0) return 'text-gray-600 bg-gray-50';
		if (luck >= -0.04) return 'text-orange-500 bg-orange-50/50';
		return 'text-red-600 bg-red-50';
	}

	function formatLuck(luck: number): string {
		const pct = (luck * 100).toFixed(1);
		return luck >= 0 ? `+${pct}%` : `${pct}%`;
	}

	/** Check if a luck value matches any of the highlight criteria */
	function isHighlighted(luck: number, day: number): boolean {
		if (!panel.highlights) return false;
		return panel.highlights.some((h: LuckHighlight) => {
			// Check day constraint
			if (!h.days.includes(day)) return false;
			// Check luck range
			if (h.minLuck !== undefined && luck < h.minLuck) return false;
			if (h.maxLuck !== undefined && luck > h.maxLuck) return false;
			return true;
		});
	}
</script>

{#if !wasm}
	<div class="animate-pulse bg-gray-100 h-20 rounded"></div>
{:else if wasmError}
	<div class="text-red-600 text-sm p-2 bg-red-50 rounded">Failed to load luck data</div>
{:else}
	<div class="grid grid-cols-7 gap-1 text-xs">
		{#each luckData as { day, luck } (day)}
			{@const highlighted = isHighlighted(luck, day)}
			<div
				class="rounded px-1 py-0.5 text-center transition-all {getLuckColor(luck)}
				{highlighted ? 'ring-2 ring-emerald-400 ring-offset-1 shadow-md' : ''}"
				title="Day {day}{highlighted ? ' (matches filter)' : ''}"
			>
				<span class="font-medium">{day}</span>
				<span class="block text-[10px]">{formatLuck(luck)}</span>
			</div>
		{/each}
	</div>
{/if}

<script lang="ts">
	import type { DailyLuckPanel } from '$lib/types/explorePanels';

	type LuckData = { day: number; luck: number };
	type WasmModule = { predict_luck_range: (seed: number, start: number, end: number) => LuckData[] };

	let {
		panel,
		seed,
		wasm
	}: {
		panel: DailyLuckPanel;
		seed: number;
		wasm: WasmModule;
	} = $props();

	let luckData: LuckData[] = $derived.by(() => {
		if (!wasm) return [];
		return wasm.predict_luck_range(seed, panel.dayRange.start, panel.dayRange.end);
	});

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
</script>

<div class="grid grid-cols-7 gap-1 text-xs">
	{#each luckData as { day, luck }}
		<div class="rounded px-1 py-0.5 text-center {getLuckColor(luck)}" title="Day {day}">
			<span class="font-medium">{day}</span>
			<span class="block text-[10px]">{formatLuck(luck)}</span>
		</div>
	{/each}
</div>

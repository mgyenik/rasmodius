<script lang="ts">
	import type { DishPanel } from '$lib/types/explorePanels';
	import { getItemName } from '$lib/data/items';

	type DayDish = { day: number; dish: { id: number; quantity: number } };
	type WasmModule = {
		predict_dish_range: (seed: number, start: number, end: number) => DayDish[];
	};

	let {
		panel,
		seed,
		wasm
	}: {
		panel: DishPanel;
		seed: number;
		wasm: WasmModule;
	} = $props();

	let dishData: DayDish[] = $derived.by(() => {
		if (!wasm) return [];
		return wasm.predict_dish_range(seed, panel.dayRange.start, panel.dayRange.end);
	});
</script>

<div class="grid grid-cols-7 gap-1 text-xs">
	{#each dishData as { day, dish }}
		<div class="rounded px-1 py-0.5 text-center bg-orange-50" title="{getItemName(dish.id)}{dish.quantity > 1 ? ` x${dish.quantity}` : ''}">
			<span class="font-medium text-orange-700">{day}</span>
			<span class="block text-[10px] text-orange-600 truncate" title={getItemName(dish.id)}>
				{getItemName(dish.id).split(' ')[0]}
			</span>
		</div>
	{/each}
</div>

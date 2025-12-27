<script lang="ts">
	import type { DishPanel, DishHighlight } from '$lib/types/explorePanels';
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

	/** Check if a dish matches any of the highlight criteria */
	function isHighlighted(dishId: number, day: number): boolean {
		if (!panel.highlights) return false;
		return panel.highlights.some((h: DishHighlight) => {
			// Check day constraint
			if (!h.days.includes(day)) return false;
			// Check dish ID
			if (h.dishId !== dishId) return false;
			return true;
		});
	}
</script>

<div class="grid grid-cols-7 gap-1 text-xs">
	{#each dishData as { day, dish }}
		{@const highlighted = isHighlighted(dish.id, day)}
		<div
			class="rounded px-1 py-0.5 text-center transition-all
				{highlighted
					? 'bg-emerald-100 ring-2 ring-emerald-400 ring-offset-1 shadow-sm'
					: 'bg-orange-50'}"
			title="{getItemName(dish.id)}{dish.quantity > 1 ? ` x${dish.quantity}` : ''}{highlighted ? ' (matches filter)' : ''}"
		>
			<span class="font-medium {highlighted ? 'text-emerald-800' : 'text-orange-700'}">{day}</span>
			<span class="block text-[10px] {highlighted ? 'text-emerald-700' : 'text-orange-600'} truncate" title={getItemName(dish.id)}>
				{getItemName(dish.id).split(' ')[0]}
			</span>
		</div>
	{/each}
</div>

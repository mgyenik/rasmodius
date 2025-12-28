<script lang="ts">
	import type { CartPanel, CartHighlight } from '$lib/types/explorePanels';
	import { getItemName } from '$lib/data/items';

	type CartItem = { id: number; price: number; quantity: number };
	type DayCart = { day: number; items: CartItem[] };
	type WasmModule = {
		predict_cart_range: (seed: number, start: number, end: number, version: string) => DayCart[];
	};

	let {
		panel,
		seed,
		version,
		wasm,
	}: {
		panel: CartPanel;
		seed: number;
		version: string;
		wasm: WasmModule;
	} = $props();

	let result = $derived.by(() => {
		if (!wasm) return { data: [] as DayCart[], error: null as string | null };
		try {
			const data = wasm.predict_cart_range(seed, panel.dayRange.start, panel.dayRange.end, version);
			return { data, error: null };
		} catch (e) {
			console.error('WASM prediction failed:', e);
			return { data: [] as DayCart[], error: String(e) };
		}
	});

	let cartData = $derived(result.data);
	let wasmError = $derived(result.error);

	function formatPrice(price: number): string {
		return price.toLocaleString() + 'g';
	}

	function getDayOfWeek(day: number): string {
		const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
		return days[(day - 1) % 7];
	}

	/** Check if an item matches any of the highlight criteria for a given day */
	function isHighlighted(item: CartItem, day: number): boolean {
		if (!panel.highlights) return false;
		return panel.highlights.some((h: CartHighlight) => {
			// Check if this item matches the highlight criteria
			if (h.itemId !== item.id) return false;
			// Check day constraint
			if (!h.days.includes(day)) return false;
			// Check price constraint if specified
			if (h.maxPrice !== undefined && item.price > h.maxPrice) return false;
			return true;
		});
	}
</script>

{#if !wasm}
	<div class="animate-pulse bg-gray-100 h-24 rounded"></div>
{:else if wasmError}
	<div class="text-red-600 text-sm p-2 bg-red-50 rounded">Failed to load cart data</div>
{:else if cartData.length === 0}
	<div class="text-sm text-gray-500 italic">No cart days in this range</div>
{:else}
	<div class="space-y-2">
		{#each cartData as { day, items }}
			<div class="border-b border-gray-100 pb-2 last:border-0 last:pb-0">
				<div class="font-medium text-amber-700 text-sm mb-1">
					Day {day} ({getDayOfWeek(day)})
				</div>
				<div class="flex flex-wrap gap-1">
					{#each items as item}
						{@const highlighted = isHighlighted(item, day)}
						<span
							class="inline-flex items-center px-1.5 py-0.5 rounded text-xs transition-all
								{highlighted
								? 'bg-emerald-100 text-emerald-900 ring-2 ring-emerald-400 ring-offset-1 font-semibold shadow-sm'
								: 'bg-amber-50 text-amber-800'}"
							title="{getItemName(item.id)} - {formatPrice(item.price)}{item.quantity > 1
								? ` x${item.quantity}`
								: ''}{highlighted ? ' (matches filter)' : ''}"
						>
							<span class="font-medium truncate max-w-[120px]">{getItemName(item.id)}</span>
							<span class="ml-1 {highlighted ? 'text-emerald-700' : 'text-amber-600'}"
								>{formatPrice(item.price)}</span
							>
						</span>
					{/each}
				</div>
			</div>
		{/each}
	</div>
{/if}

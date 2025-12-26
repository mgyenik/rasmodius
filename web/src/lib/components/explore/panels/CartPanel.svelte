<script lang="ts">
	import type { CartPanel } from '$lib/types/explorePanels';
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
		wasm
	}: {
		panel: CartPanel;
		seed: number;
		version: string;
		wasm: WasmModule;
	} = $props();

	let cartData: DayCart[] = $derived.by(() => {
		if (!wasm) return [];
		return wasm.predict_cart_range(seed, panel.dayRange.start, panel.dayRange.end, version);
	});

	function formatPrice(price: number): string {
		return price.toLocaleString() + 'g';
	}

	function getDayOfWeek(day: number): string {
		const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
		return days[(day - 1) % 7];
	}
</script>

{#if cartData.length === 0}
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
						<span
							class="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-amber-50 text-amber-800"
							title="{getItemName(item.id)} - {formatPrice(item.price)}{item.quantity > 1 ? ` x${item.quantity}` : ''}"
						>
							<span class="font-medium truncate max-w-[120px]">{getItemName(item.id)}</span>
							<span class="ml-1 text-amber-600">{formatPrice(item.price)}</span>
						</span>
					{/each}
				</div>
			</div>
		{/each}
	</div>
{/if}

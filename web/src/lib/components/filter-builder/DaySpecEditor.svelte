<script lang="ts">
	import type { DaySpec } from '$lib/types/filters';

	let {
		daySpec = $bindable(),
		allowedTypes = ['exact', 'range', 'season', 'any'] as const
	}: {
		daySpec: DaySpec;
		allowedTypes?: readonly DaySpec['type'][];
	} = $props();

	function updateType(type: DaySpec['type']) {
		switch (type) {
			case 'exact':
				daySpec = { type: 'exact', day: 1 };
				break;
			case 'range':
				daySpec = { type: 'range', start: 1, end: 28 };
				break;
			case 'season':
				daySpec = { type: 'season', season: 0, year: 1 };
				break;
			case 'any':
				daySpec = { type: 'any' };
				break;
		}
	}

	// Labels for select options
	const TYPE_LABELS: Record<DaySpec['type'], string> = {
		exact: 'on day',
		range: 'in range',
		season: 'in season',
		any: 'any day'
	};

	// Alternative labels for cart_item style
	const ALT_TYPE_LABELS: Record<DaySpec['type'], string> = {
		exact: 'on day',
		range: 'day range',
		season: 'season',
		any: 'any day'
	};

	// Use alternative labels when only season/range are allowed (cart_item style)
	const useAltLabels = $derived(
		allowedTypes.length === 2 &&
		allowedTypes.includes('season') &&
		allowedTypes.includes('range')
	);

	const labels = $derived(useAltLabels ? ALT_TYPE_LABELS : TYPE_LABELS);
</script>

<select
	class="px-2 py-1 border border-gray-300 rounded text-sm"
	value={daySpec.type}
	onchange={(e) => updateType(e.currentTarget.value as DaySpec['type'])}
>
	{#each allowedTypes as type}
		<option value={type}>{labels[type]}</option>
	{/each}
</select>

{#if daySpec.type === 'exact'}
	<input
		type="number"
		class="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
		bind:value={daySpec.day}
		min="1"
	/>
{:else if daySpec.type === 'range'}
	<input
		type="number"
		class="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
		bind:value={daySpec.start}
		min="1"
	/>
	<span class="text-gray-500">to</span>
	<input
		type="number"
		class="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
		bind:value={daySpec.end}
		min="1"
	/>
{:else if daySpec.type === 'season'}
	<select
		class="px-2 py-1 border border-gray-300 rounded text-sm"
		bind:value={daySpec.season}
	>
		<option value={0}>Spring</option>
		<option value={1}>Summer</option>
		<option value={2}>Fall</option>
		<option value={3}>Winter</option>
	</select>
	<span class="text-gray-500">Y</span>
	<input
		type="number"
		class="w-14 px-2 py-1 border border-gray-300 rounded text-sm"
		bind:value={daySpec.year}
		min="1"
	/>
{/if}

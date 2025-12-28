<script lang="ts">
	import type { ExplorePanel, GeodesPanel } from '$lib/types/explorePanels';

	let {
		panel,
		onSave,
		onCancel,
	}: {
		panel: ExplorePanel;
		onSave: (updated: ExplorePanel) => void;
		onCancel: () => void;
	} = $props();

	// Create local editable state based on panel type
	let startValue = $state(getStartValue(panel));
	let endValue = $state(getEndValue(panel));
	let dayValue = $state(panel.type === 'mine_floors' ? panel.day : 1);
	let geodeType = $state<GeodesPanel['geodeType']>(
		panel.type === 'geodes' ? panel.geodeType : 'omni'
	);

	function getStartValue(p: ExplorePanel): number {
		switch (p.type) {
			case 'cart':
			case 'night_events':
			case 'daily_luck':
			case 'weather':
			case 'dish':
				return p.dayRange.start;
			case 'geodes':
				return p.geodeRange.start;
			case 'mine_floors':
				return p.floorRange.start;
		}
	}

	function getEndValue(p: ExplorePanel): number {
		switch (p.type) {
			case 'cart':
			case 'night_events':
			case 'daily_luck':
			case 'weather':
			case 'dish':
				return p.dayRange.end;
			case 'geodes':
				return p.geodeRange.end;
			case 'mine_floors':
				return p.floorRange.end;
		}
	}

	function handleSave() {
		let updated: ExplorePanel;

		switch (panel.type) {
			case 'cart':
				updated = { ...panel, dayRange: { start: startValue, end: endValue } };
				break;
			case 'night_events':
				updated = { ...panel, dayRange: { start: startValue, end: endValue } };
				break;
			case 'daily_luck':
				updated = { ...panel, dayRange: { start: startValue, end: endValue } };
				break;
			case 'weather':
				updated = { ...panel, dayRange: { start: startValue, end: endValue } };
				break;
			case 'dish':
				updated = { ...panel, dayRange: { start: startValue, end: endValue } };
				break;
			case 'geodes':
				updated = {
					...panel,
					geodeType,
					geodeRange: { start: startValue, end: endValue },
				};
				break;
			case 'mine_floors':
				updated = {
					...panel,
					day: dayValue,
					floorRange: { start: startValue, end: endValue },
				};
				break;
		}

		onSave(updated);
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			handleSave();
		} else if (e.key === 'Escape') {
			onCancel();
		}
	}

	const geodeOptions: { value: GeodesPanel['geodeType']; label: string }[] = [
		{ value: 'geode', label: 'Regular' },
		{ value: 'frozen', label: 'Frozen' },
		{ value: 'magma', label: 'Magma' },
		{ value: 'omni', label: 'Omni' },
		{ value: 'trove', label: 'Artifact Trove' },
		{ value: 'coconut', label: 'Golden Coconut' },
	];
</script>

<div class="flex flex-wrap items-center gap-2 text-sm" onkeydown={handleKeydown}>
	{#if panel.type === 'mine_floors'}
		<!-- Mine floors: day + floor range -->
		<label class="flex items-center gap-1">
			<span class="text-gray-600">Day:</span>
			<input
				type="number"
				bind:value={dayValue}
				min="1"
				class="w-16 px-1.5 py-0.5 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
			/>
		</label>
		<label class="flex items-center gap-1">
			<span class="text-gray-600">Floors:</span>
			<input
				type="number"
				bind:value={startValue}
				min="1"
				max="120"
				class="w-14 px-1.5 py-0.5 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
			/>
			<span class="text-gray-400">-</span>
			<input
				type="number"
				bind:value={endValue}
				min="1"
				max="120"
				class="w-14 px-1.5 py-0.5 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
			/>
		</label>
	{:else if panel.type === 'geodes'}
		<!-- Geodes: type + number range -->
		<label class="flex items-center gap-1">
			<span class="text-gray-600">Type:</span>
			<select
				bind:value={geodeType}
				class="px-1.5 py-0.5 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
			>
				{#each geodeOptions as opt}
					<option value={opt.value}>{opt.label}</option>
				{/each}
			</select>
		</label>
		<label class="flex items-center gap-1">
			<span class="text-gray-600">#</span>
			<input
				type="number"
				bind:value={startValue}
				min="1"
				class="w-14 px-1.5 py-0.5 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
			/>
			<span class="text-gray-400">-</span>
			<input
				type="number"
				bind:value={endValue}
				min="1"
				class="w-14 px-1.5 py-0.5 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
			/>
		</label>
	{:else}
		<!-- Day-based panels -->
		<label class="flex items-center gap-1">
			<span class="text-gray-600">Days:</span>
			<input
				type="number"
				bind:value={startValue}
				min="1"
				class="w-16 px-1.5 py-0.5 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
			/>
			<span class="text-gray-400">-</span>
			<input
				type="number"
				bind:value={endValue}
				min="1"
				class="w-16 px-1.5 py-0.5 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
			/>
		</label>
	{/if}

	<div class="flex gap-1 ml-auto">
		<button
			class="px-2 py-0.5 bg-amber-500 text-white rounded text-xs font-medium hover:bg-amber-600 transition-colors"
			onclick={handleSave}
		>
			Save
		</button>
		<button
			class="px-2 py-0.5 bg-gray-200 text-gray-700 rounded text-xs font-medium hover:bg-gray-300 transition-colors"
			onclick={onCancel}
		>
			Cancel
		</button>
	</div>
</div>

<script lang="ts">
	import type { FilterGroup, FilterCondition } from '$lib/types/filters';
	import { generateId } from '$lib/types/filters';
	import FilterConditionEditor from './FilterConditionEditor.svelte';
	import FilterGroupComponent from './FilterGroup.svelte';

	let {
		group = $bindable(),
		isRoot = false,
		onMeaningfulChange
	}: {
		group: FilterGroup;
		isRoot?: boolean;
		onMeaningfulChange?: () => void;
	} = $props();

	function toggleLogic() {
		group.logic = group.logic === 'and' ? 'or' : 'and';
	}

	function removeCondition(index: number) {
		group.conditions = group.conditions.filter((_, i) => i !== index);
		onMeaningfulChange?.();
	}

	function addSubgroup() {
		const newGroup: FilterGroup = {
			id: generateId(),
			logic: group.logic === 'and' ? 'or' : 'and',
			conditions: [],
		};
		group.conditions = [...group.conditions, newGroup];
		onMeaningfulChange?.();
	}

	function isGroup(item: FilterCondition | FilterGroup): item is FilterGroup {
		return 'logic' in item && 'conditions' in item;
	}
</script>

<div class="space-y-2">
	{#if group.conditions.length === 0}
		<p class="text-gray-400 italic text-sm py-2">No filters added yet. Add a filter to get started.</p>
	{:else}
		<!-- Logic Toggle -->
		<div class="flex items-center gap-2 mb-3">
			<span class="text-sm text-gray-600">Match</span>
			<button
				onclick={toggleLogic}
				class="px-3 py-1 text-sm font-medium rounded transition-colors {group.logic === 'and'
					? 'bg-blue-100 text-blue-800'
					: 'bg-orange-100 text-orange-800'}"
			>
				{group.logic === 'and' ? 'ALL' : 'ANY'}
			</button>
			<span class="text-sm text-gray-600">of these conditions</span>
		</div>

		<!-- Conditions List -->
		<div class="space-y-2">
			{#each group.conditions as item, index}
				<div class="flex items-start gap-2">
					{#if index > 0}
						<span class="text-xs text-gray-400 uppercase py-2 w-8 text-center flex-shrink-0">
							{group.logic}
						</span>
					{:else}
						<span class="w-8 flex-shrink-0"></span>
					{/if}

					<div class="flex-1 bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
						{#if isGroup(item)}
							<!-- Nested Group - use array indexing for binding -->
							<div class="border-l-4 border-gray-300 pl-3">
								<FilterGroupComponent bind:group={group.conditions[index]} isRoot={false} {onMeaningfulChange} />
							</div>
						{:else}
							<!-- Condition - use array indexing for binding -->
							<FilterConditionEditor bind:condition={group.conditions[index]} />
						{/if}
					</div>

					<button
						onclick={() => removeCondition(index)}
						class="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors flex-shrink-0"
						title="Remove"
					>
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				</div>
			{/each}
		</div>
	{/if}

	{#if !isRoot && group.conditions.length > 0}
		<button
			onclick={addSubgroup}
			class="text-xs text-gray-500 hover:text-gray-700 mt-2"
		>
			+ Add nested group
		</button>
	{/if}
</div>

<script lang="ts">
	import type { ExplorePanel } from '$lib/types/explorePanels';
	import { getPanelLabel, getPanelRangeLabel } from '$lib/types/explorePanels';
	import PanelRangeEditor from './PanelRangeEditor.svelte';
	import type { Snippet } from 'svelte';

	let {
		panel,
		onRemove,
		onUpdate,
		children,
	}: {
		panel: ExplorePanel;
		onRemove: () => void;
		onUpdate?: (updated: ExplorePanel) => void;
		children: Snippet;
	} = $props();

	let isCollapsed = $state(false);
	let isEditing = $state(false);

	function handleEditClick() {
		isEditing = true;
	}

	function handleSave(updated: ExplorePanel) {
		onUpdate?.(updated);
		isEditing = false;
	}

	function handleCancel() {
		isEditing = false;
	}
</script>

<div class="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
	<div class="px-3 py-2 bg-gray-50 border-b border-gray-200">
		{#if isEditing}
			<!-- Edit mode -->
			<div class="flex items-center gap-2">
				<span class="font-medium text-gray-800 shrink-0">{getPanelLabel(panel)}</span>
				<PanelRangeEditor {panel} onSave={handleSave} onCancel={handleCancel} />
			</div>
		{:else}
			<!-- Normal mode -->
			<div class="flex items-center justify-between">
				<button
					class="flex items-center gap-2 text-left hover:text-amber-700 transition-colors"
					onclick={() => (isCollapsed = !isCollapsed)}
				>
					<span class="text-gray-400 text-xs">{isCollapsed ? '▶' : '▼'}</span>
					<span class="font-medium text-gray-800">{getPanelLabel(panel)}</span>
					<span class="text-xs text-gray-500">{getPanelRangeLabel(panel)}</span>
				</button>
				<div class="flex items-center gap-1">
					{#if onUpdate}
						<button
							class="p-1 text-gray-400 hover:text-amber-600 transition-colors"
							onclick={handleEditClick}
							title="Edit panel range"
						>
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
								/>
							</svg>
						</button>
					{/if}
					<button
						class="p-1 text-gray-400 hover:text-red-600 transition-colors"
						onclick={onRemove}
						title="Remove panel"
					>
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M6 18L18 6M6 6l12 12"
							/>
						</svg>
					</button>
				</div>
			</div>
		{/if}
	</div>
	{#if !isCollapsed}
		<div class="p-3">
			{@render children()}
		</div>
	{/if}
</div>

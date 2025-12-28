<script lang="ts">
	import type { NightEventsPanel, NightEventHighlight } from '$lib/types/explorePanels';

	type EventData = { day: number; event: string };
	type WasmModule = {
		predict_night_events_range: (
			seed: number,
			start: number,
			end: number,
			version: string
		) => EventData[];
	};

	let {
		panel,
		seed,
		version,
		wasm
	}: {
		panel: NightEventsPanel;
		seed: number;
		version: string;
		wasm: WasmModule;
	} = $props();

	let result = $derived.by(() => {
		if (!wasm) return { data: [] as EventData[], error: null as string | null };
		try {
			const data = wasm.predict_night_events_range(seed, panel.dayRange.start, panel.dayRange.end, version);
			return { data, error: null };
		} catch (e) {
			console.error('WASM prediction failed:', e);
			return { data: [] as EventData[], error: String(e) };
		}
	});

	let eventsData = $derived(result.data);
	let wasmError = $derived(result.error);

	// Only show days with actual events
	let eventsWithContent = $derived(eventsData.filter((e) => e.event !== 'none'));

	/** Check if an event matches any of the highlight criteria */
	function isHighlighted(event: string, day: number): boolean {
		if (!panel.highlights) return false;
		return panel.highlights.some((h: NightEventHighlight) => {
			// Check day constraint
			if (!h.days.includes(day)) return false;
			// Check event type (any matches all events)
			if (h.eventType !== 'any' && h.eventType !== event) return false;
			return true;
		});
	}

	function getEventIcon(event: string): string {
		switch (event) {
			case 'fairy':
				return '🧚';
			case 'witch':
				return '🧙';
			case 'meteor':
				return '☄️';
			case 'ufo':
				return '🛸';
			case 'owl':
				return '🦉';
			case 'earthquake':
				return '⚡';
			default:
				return '';
		}
	}

	function getEventLabel(event: string): string {
		switch (event) {
			case 'fairy':
				return 'Crop Fairy';
			case 'witch':
				return 'Witch';
			case 'meteor':
				return 'Meteor';
			case 'ufo':
				return 'Strange Capsule';
			case 'owl':
				return 'Stone Owl';
			case 'earthquake':
				return 'Earthquake';
			default:
				return event;
		}
	}

	function getEventClass(event: string): string {
		switch (event) {
			case 'fairy':
				return 'bg-pink-50 text-pink-700';
			case 'witch':
				return 'bg-purple-50 text-purple-700';
			case 'meteor':
				return 'bg-orange-50 text-orange-700';
			case 'ufo':
				return 'bg-green-50 text-green-700';
			case 'owl':
				return 'bg-amber-50 text-amber-700';
			case 'earthquake':
				return 'bg-blue-50 text-blue-700';
			default:
				return 'bg-gray-50 text-gray-600';
		}
	}
</script>

{#if wasmError}
	<div class="text-red-600 text-sm p-2 bg-red-50 rounded">Failed to load event data</div>
{:else if eventsWithContent.length === 0}
	<div class="text-sm text-gray-500 italic">No events in this range</div>
{:else}
	<div class="flex flex-wrap gap-2 text-sm">
		{#each eventsWithContent as { day, event }}
			{@const highlighted = isHighlighted(event, day)}
			<div
				class="rounded-lg px-2 py-1 transition-all {getEventClass(event)}
					{highlighted ? 'ring-2 ring-emerald-400 ring-offset-1 shadow-md' : ''}"
				title="{getEventLabel(event)}{highlighted ? ' (matches filter)' : ''}"
			>
				<span class="mr-1">{getEventIcon(event)}</span>
				<span class="font-medium">Day {day}</span>
				<span class="text-xs ml-1 opacity-75">{getEventLabel(event)}</span>
			</div>
		{/each}
	</div>
{/if}

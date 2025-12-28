<script lang="ts">
	import type { WeatherPanel, WeatherHighlight } from '$lib/types/explorePanels';

	type WeatherData = { day: number; weather: string };
	type WasmModule = {
		predict_weather_range: (
			seed: number,
			start: number,
			end: number,
			version: string
		) => WeatherData[];
	};

	let {
		panel,
		seed,
		version,
		wasm,
	}: {
		panel: WeatherPanel;
		seed: number;
		version: string;
		wasm: WasmModule;
	} = $props();

	let result = $derived.by(() => {
		if (!wasm) return { data: [] as WeatherData[], error: null as string | null };
		try {
			const data = wasm.predict_weather_range(
				seed,
				panel.dayRange.start,
				panel.dayRange.end,
				version
			);
			return { data, error: null };
		} catch (e) {
			console.error('WASM prediction failed:', e);
			return { data: [] as WeatherData[], error: String(e) };
		}
	});

	let weatherData = $derived(result.data);
	let wasmError = $derived(result.error);

	/** Map internal weather types to filter weather types */
	function normalizeWeatherType(weather: string): string {
		// The filter uses 'storm' but WASM returns 'lightning'
		if (weather === 'lightning') return 'storm';
		// The filter uses 'windy' but WASM returns 'debris'
		if (weather === 'debris') return 'windy';
		return weather;
	}

	/** Check if a weather value matches any of the highlight criteria */
	function isHighlighted(weather: string, day: number): boolean {
		if (!panel.highlights) return false;
		const normalizedWeather = normalizeWeatherType(weather);
		return panel.highlights.some((h: WeatherHighlight) => {
			// Check day constraint
			if (!h.days.includes(day)) return false;
			// Check weather type (any matches all)
			if (h.weatherType !== 'any' && h.weatherType !== normalizedWeather) return false;
			return true;
		});
	}

	function getWeatherIcon(weather: string): string {
		switch (weather) {
			case 'sunny':
				return '☀️';
			case 'rain':
				return '🌧️';
			case 'lightning':
				return '⛈️';
			case 'debris':
				return '🍃';
			case 'snow':
				return '❄️';
			case 'green_rain':
				return '💚';
			default:
				return '❓';
		}
	}

	function getWeatherClass(weather: string): string {
		switch (weather) {
			case 'sunny':
				return 'bg-yellow-50 text-yellow-600';
			case 'rain':
				return 'bg-blue-50 text-blue-600';
			case 'lightning':
				return 'bg-purple-50 text-purple-600';
			case 'debris':
				return 'bg-teal-50 text-teal-600';
			case 'snow':
				return 'bg-blue-50 text-blue-300';
			case 'green_rain':
				return 'bg-green-50 text-green-600';
			default:
				return 'bg-gray-50 text-gray-500';
		}
	}
</script>

{#if !wasm}
	<div class="animate-pulse bg-gray-100 h-20 rounded"></div>
{:else if wasmError}
	<div class="text-red-600 text-sm p-2 bg-red-50 rounded">Failed to load weather data</div>
{:else}
	<div class="grid grid-cols-7 gap-1 text-xs">
		{#each weatherData as { day, weather } (day)}
			{@const highlighted = isHighlighted(weather, day)}
			<div
				class="rounded px-1 py-0.5 text-center transition-all {getWeatherClass(weather)}
				{highlighted ? 'ring-2 ring-emerald-400 ring-offset-1 shadow-md' : ''}"
				title="Day {day}: {weather}{highlighted ? ' (matches filter)' : ''}"
			>
				<span class="font-medium">{day}</span>
				<span class="block text-sm">{getWeatherIcon(weather)}</span>
			</div>
		{/each}
	</div>
{/if}

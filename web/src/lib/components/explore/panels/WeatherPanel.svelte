<script lang="ts">
	import type { WeatherPanel } from '$lib/types/explorePanels';

	type WeatherData = { day: number; weather: string };
	type WasmModule = {
		predict_weather_range: (seed: number, start: number, end: number, version: string) => WeatherData[];
	};

	let {
		panel,
		seed,
		version,
		wasm
	}: {
		panel: WeatherPanel;
		seed: number;
		version: string;
		wasm: WasmModule;
	} = $props();

	let weatherData: WeatherData[] = $derived.by(() => {
		if (!wasm) return [];
		return wasm.predict_weather_range(seed, panel.dayRange.start, panel.dayRange.end, version);
	});

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

<div class="grid grid-cols-7 gap-1 text-xs">
	{#each weatherData as { day, weather }}
		<div
			class="rounded px-1 py-0.5 text-center {getWeatherClass(weather)}"
			title="Day {day}: {weather}"
		>
			<span class="font-medium">{day}</span>
			<span class="block text-sm">{getWeatherIcon(weather)}</span>
		</div>
	{/each}
</div>

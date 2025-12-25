import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
	plugins: [svelte({ hot: false })],
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}'],
		environment: 'node',
		globals: true,
	},
	resolve: {
		alias: {
			$lib: '/home/m/git/rasmodius/web/src/lib',
		},
	},
	optimizeDeps: {
		exclude: ['rasmodius'],
	},
});

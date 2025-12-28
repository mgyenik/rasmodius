import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import wasm from 'vite-plugin-wasm';
import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
	resolve: {
		alias: {
			rasmodius: path.resolve(__dirname, '../pkg/rasmodius.js'),
		},
	},
	plugins: [wasm(), tailwindcss(), sveltekit()],
	optimizeDeps: {
		exclude: ['rasmodius'],
	},
	build: {
		target: 'esnext',
	},
	worker: {
		format: 'es',
		plugins: () => [wasm()],
	},
	server: {
		fs: {
			allow: ['..'],
		},
	},
});

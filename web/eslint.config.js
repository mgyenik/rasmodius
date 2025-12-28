import js from '@eslint/js';
import ts from 'typescript-eslint';
import svelte from 'eslint-plugin-svelte';
import globals from 'globals';

export default ts.config(
	js.configs.recommended,
	...ts.configs.recommended,
	...svelte.configs['flat/recommended'],
	{
		languageOptions: {
			globals: { ...globals.browser, ...globals.node },
		},
	},
	{
		files: ['**/*.svelte'],
		languageOptions: {
			parserOptions: { parser: ts.parser },
		},
	},
	{
		rules: {
			// Allow unused vars prefixed with _
			'@typescript-eslint/no-unused-vars': [
				'error',
				{ argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
			],
			// Disable navigation resolve rule (we use standard navigation)
			'svelte/no-navigation-without-resolve': 'off',
			// Each keys are a performance hint, not required for correctness
			'svelte/require-each-key': 'warn',
		},
	},
	{
		ignores: ['build/', '.svelte-kit/', 'dist/', 'pkg/', 'playwright-report/'],
	}
);

<script lang="ts">
	import { page } from '$app/stores';
</script>

<div class="min-h-screen flex items-center justify-center bg-gray-50">
	<div class="text-center p-8">
		<h1 class="text-4xl font-bold text-red-600 mb-4">Something went wrong</h1>
		<p class="text-gray-600 mb-6 max-w-md">
			{$page.error?.message || 'An unexpected error occurred'}
		</p>
		<div class="flex gap-3 justify-center">
			<button
				onclick={() => window.location.reload()}
				class="px-4 py-2 bg-amber-500 text-white rounded-lg font-medium hover:bg-amber-600 transition-colors"
			>
				Reload Page
			</button>
			<a
				href="/"
				class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
			>
				Go Home
			</a>
		</div>
		{#if $page.status}
			<p class="text-sm text-gray-400 mt-6">Error code: {$page.status}</p>
		{/if}
	</div>
</div>

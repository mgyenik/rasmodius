/**
 * Web Worker for parallel seed searching.
 *
 * This is a thin wrapper around the WASM search_range() function.
 * All filter evaluation happens in Rust for maximum performance.
 *
 * Search is processed in chunks to allow cancellation between WASM calls.
 */

// Chunk size for processing - smaller chunks = more responsive cancellation
// and more frequent progress updates.
const CHUNK_SIZE = 10_000;

// Message types
export type WorkerRequest =
	| { type: 'init' }
	| {
			type: 'search';
			id: string;
			filterJson: string;
			startSeed: number;
			endSeed: number;
			maxResults: number;
			version: string;
	  }
	| { type: 'cancel'; id: string };

export type WorkerResponse =
	| { type: 'ready' }
	| { type: 'progress'; id: string; checked: number; found: number }
	| { type: 'match'; id: string; seed: number }
	| { type: 'complete'; id: string }
	| { type: 'error'; id: string; message: string };

// WASM module reference
let wasm: typeof import('rasmodius') | null = null;
let cancelled = false;
let currentSearchId: string | null = null;

// Initialize WASM module
async function init() {
	try {
		const wasmModule = await import('rasmodius');
		await wasmModule.default();
		wasm = wasmModule;
		self.postMessage({ type: 'ready' } as WorkerResponse);
	} catch (e) {
		self.postMessage({
			type: 'error',
			id: '',
			message: `Failed to load WASM: ${e}`,
		} as WorkerResponse);
	}
}

// Yield to event loop - allows cancel messages to be processed between chunks
function yieldToEventLoop(): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, 0));
}

// Handle messages from main thread
self.onmessage = async (e: MessageEvent<WorkerRequest>) => {
	const msg = e.data;

	switch (msg.type) {
		case 'init':
			await init();
			break;

		case 'search': {
			if (!wasm) {
				self.postMessage({
					type: 'error',
					id: msg.id,
					message: 'WASM not initialized',
				} as WorkerResponse);
				return;
			}

			currentSearchId = msg.id;
			cancelled = false;

			// Track total progress across all chunks
			let totalChecked = 0;
			let totalMatches = 0;
			const workerSoftLimit = msg.maxResults;

			try {
				// Send initial progress immediately so UI shows 0%
				self.postMessage({
					type: 'progress',
					id: msg.id,
					checked: 0,
					found: 0,
				} as WorkerResponse);

				// Process range in chunks to allow cancellation between WASM calls
				let chunkStart = msg.startSeed;

				while (chunkStart <= msg.endSeed && !cancelled && totalMatches < workerSoftLimit) {
					const chunkEnd = Math.min(chunkStart + CHUNK_SIZE - 1, msg.endSeed);
					const remainingResults = workerSoftLimit - totalMatches;

					// Track matches in this chunk
					let chunkMatches = 0;

					// Call WASM for this chunk - no progress callback, we report between chunks
					wasm.search_range(
						msg.filterJson,
						chunkStart,
						chunkEnd,
						remainingResults,
						msg.version,
						// on_match callback
						(seed: number): boolean => {
							chunkMatches++;
							self.postMessage({
								type: 'match',
								id: msg.id,
								seed,
							} as WorkerResponse);
							return chunkMatches < remainingResults;
						}
					);

					// Update totals
					totalChecked += chunkEnd - chunkStart + 1;
					totalMatches += chunkMatches;

					// Report progress between chunks
					self.postMessage({
						type: 'progress',
						id: msg.id,
						checked: totalChecked,
						found: totalMatches,
					} as WorkerResponse);

					// Move to next chunk
					chunkStart = chunkEnd + 1;

					// Yield to event loop between chunks - this allows cancel messages to be processed
					if (chunkStart <= msg.endSeed && !cancelled && totalMatches < workerSoftLimit) {
						await yieldToEventLoop();
					}
				}

				// Send final progress
				self.postMessage({
					type: 'progress',
					id: msg.id,
					checked: totalChecked,
					found: totalMatches,
				} as WorkerResponse);

				self.postMessage({ type: 'complete', id: msg.id } as WorkerResponse);
			} catch (err) {
				self.postMessage({
					type: 'error',
					id: msg.id,
					message: String(err),
				} as WorkerResponse);
			}

			currentSearchId = null;
			break;
		}

		case 'cancel':
			if (currentSearchId === msg.id) {
				cancelled = true;
			}
			break;
	}
};

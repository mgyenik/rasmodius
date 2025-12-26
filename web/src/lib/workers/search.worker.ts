/**
 * Web Worker for parallel seed searching.
 *
 * This is a thin wrapper around the WASM search_range() function.
 * All filter evaluation happens in Rust for maximum performance.
 */

// Message types
export type WorkerRequest =
  | { type: 'init' }
  | { type: 'search'; id: string; filterJson: string; startSeed: number; endSeed: number; maxResults: number; version: string }
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
    self.postMessage({ type: 'error', id: '', message: `Failed to load WASM: ${e}` } as WorkerResponse);
  }
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
        self.postMessage({ type: 'error', id: msg.id, message: 'WASM not initialized' } as WorkerResponse);
        return;
      }

      currentSearchId = msg.id;
      cancelled = false;

      // Track matches sent by this worker - used to enforce soft limit per worker
      // This is needed because the worker can't receive cancel messages while WASM is running
      let matchesSent = 0;
      const workerSoftLimit = msg.maxResults; // Each worker stops at its own limit

      try {
        // Call WASM search_range with callbacks
        wasm.search_range(
          msg.filterJson,
          msg.startSeed,
          msg.endSeed,
          msg.maxResults,
          msg.version,
          // on_progress callback - returns false to stop searching
          (checked: number, found: number): boolean => {
            self.postMessage({
              type: 'progress',
              id: msg.id,
              checked,
              found,
            } as WorkerResponse);
            return !cancelled;
          },
          // on_match callback - returns false to stop searching
          (seed: number): boolean => {
            matchesSent++;
            self.postMessage({
              type: 'match',
              id: msg.id,
              seed,
            } as WorkerResponse);
            // Stop if this worker has sent enough matches
            // Global coordination happens in WorkerPool which will trim to exact maxResults
            return matchesSent < workerSoftLimit;
          }
        );

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

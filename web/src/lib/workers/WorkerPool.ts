/**
 * Worker Pool Manager for parallel seed searching
 * Coordinates multiple web workers to search different seed ranges
 */

import type { FilterGroup } from '$lib/types/filters';
import type { WorkerRequest, WorkerResponse } from './search.worker';

export interface SearchProgress {
  totalChecked: number;
  totalSeeds: number;
  matchesFound: number;
  seedsPerSecond: number;
  estimatedTimeRemaining: number;
  isComplete: boolean;
}

export interface SearchCallbacks {
  onMatch?: (seed: number) => void;
  onProgress?: (progress: SearchProgress) => void;
  onComplete?: (matches: number[]) => void;
  onError?: (error: string) => void;
}

export class WorkerPool {
  private workers: Worker[] = [];
  private readyWorkers: Set<Worker> = new Set();
  private workerCount: number;
  private searchId: string | null = null;
  private startTime: number = 0;
  private callbacks: SearchCallbacks = {};

  // Search state
  private totalSeeds: number = 0;
  private checkedByWorker: Map<Worker, number> = new Map();
  private allMatches: number[] = [];
  private completedWorkers: number = 0;

  constructor(workerCount?: number) {
    // Default to navigator.hardwareConcurrency or 4
    this.workerCount = workerCount ?? Math.max(1, (navigator.hardwareConcurrency || 4) - 1);
  }

  async initialize(): Promise<void> {
    const initPromises: Promise<void>[] = [];

    for (let i = 0; i < this.workerCount; i++) {
      const worker = new Worker(
        new URL('./search.worker.ts', import.meta.url),
        { type: 'module' }
      );

      const initPromise = new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Worker init timeout')), 10000);

        worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
          if (e.data.type === 'ready') {
            clearTimeout(timeout);
            this.readyWorkers.add(worker);
            resolve();
          }
        };

        worker.onerror = (e) => {
          clearTimeout(timeout);
          reject(new Error(`Worker error: ${e.message}`));
        };
      });

      worker.postMessage({ type: 'init' } as WorkerRequest);
      this.workers.push(worker);
      initPromises.push(initPromise);
    }

    await Promise.all(initPromises);
    console.log(`WorkerPool initialized with ${this.workerCount} workers`);
  }

  private setupWorkerHandlers(worker: Worker): void {
    worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
      const msg = e.data;

      if (msg.type === 'ready') {
        return; // Handled during init
      }

      if (msg.id !== this.searchId) {
        return; // Stale message from cancelled search
      }

      switch (msg.type) {
        case 'match':
          this.allMatches.push(msg.seed);
          this.callbacks.onMatch?.(msg.seed);
          break;

        case 'progress':
          this.checkedByWorker.set(worker, msg.checked);
          this.reportProgress();
          break;

        case 'complete':
          this.checkedByWorker.set(worker, msg.checked);
          this.completedWorkers++;

          if (this.completedWorkers === this.workers.length) {
            this.finishSearch();
          }
          break;

        case 'error':
          this.callbacks.onError?.(msg.message);
          break;
      }
    };
  }

  private reportProgress(): void {
    const totalChecked = Array.from(this.checkedByWorker.values()).reduce((a, b) => a + b, 0);
    const elapsed = (Date.now() - this.startTime) / 1000;
    const seedsPerSecond = elapsed > 0 ? totalChecked / elapsed : 0;
    const remaining = this.totalSeeds - totalChecked;
    const estimatedTimeRemaining = seedsPerSecond > 0 ? remaining / seedsPerSecond : 0;

    this.callbacks.onProgress?.({
      totalChecked,
      totalSeeds: this.totalSeeds,
      matchesFound: this.allMatches.length,
      seedsPerSecond,
      estimatedTimeRemaining,
      isComplete: false
    });
  }

  private finishSearch(): void {
    const totalChecked = Array.from(this.checkedByWorker.values()).reduce((a, b) => a + b, 0);
    const elapsed = (Date.now() - this.startTime) / 1000;

    // Sort matches
    this.allMatches.sort((a, b) => a - b);

    this.callbacks.onProgress?.({
      totalChecked,
      totalSeeds: this.totalSeeds,
      matchesFound: this.allMatches.length,
      seedsPerSecond: totalChecked / elapsed,
      estimatedTimeRemaining: 0,
      isComplete: true
    });

    this.callbacks.onComplete?.(this.allMatches);
    this.searchId = null;
  }

  async search(
    filter: FilterGroup,
    startSeed: number,
    endSeed: number,
    maxResults: number,
    callbacks: SearchCallbacks,
    version: string = '1.6'
  ): Promise<void> {
    if (this.searchId) {
      throw new Error('Search already in progress');
    }

    if (this.readyWorkers.size !== this.workers.length) {
      throw new Error('Workers not ready');
    }

    this.searchId = crypto.randomUUID();
    this.callbacks = callbacks;
    this.startTime = Date.now();
    this.totalSeeds = endSeed - startSeed + 1;
    this.checkedByWorker.clear();
    this.allMatches = [];
    this.completedWorkers = 0;

    // Divide work among workers
    const seedsPerWorker = Math.ceil(this.totalSeeds / this.workers.length);

    this.workers.forEach((worker, index) => {
      this.setupWorkerHandlers(worker);
      this.checkedByWorker.set(worker, 0);

      const workerStart = startSeed + index * seedsPerWorker;
      const workerEnd = Math.min(workerStart + seedsPerWorker - 1, endSeed);

      if (workerStart <= endSeed) {
        // Clone filter to plain object - Svelte 5 reactive proxies can't be cloned via postMessage
        const plainFilter = JSON.parse(JSON.stringify(filter));

        worker.postMessage({
          type: 'search',
          id: this.searchId,
          startSeed: workerStart,
          endSeed: workerEnd,
          filter: plainFilter,
          maxResults: Math.ceil(maxResults / this.workers.length) + 10, // Allow some buffer
          version
        } as WorkerRequest);
      } else {
        // No work for this worker
        this.completedWorkers++;
      }
    });

    // Check if all workers had no work
    if (this.completedWorkers === this.workers.length) {
      this.finishSearch();
    }
  }

  cancel(): void {
    if (!this.searchId) return;

    const id = this.searchId;
    this.workers.forEach(worker => {
      worker.postMessage({ type: 'cancel', id } as WorkerRequest);
    });

    this.searchId = null;
    this.callbacks = {};
  }

  isSearching(): boolean {
    return this.searchId !== null;
  }

  getWorkerCount(): number {
    return this.workerCount;
  }

  terminate(): void {
    this.workers.forEach(worker => worker.terminate());
    this.workers = [];
    this.readyWorkers.clear();
  }
}

// Singleton instance
let poolInstance: WorkerPool | null = null;

export async function getWorkerPool(): Promise<WorkerPool> {
  if (!poolInstance) {
    poolInstance = new WorkerPool();
    await poolInstance.initialize();
  }
  return poolInstance;
}

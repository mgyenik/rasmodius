# Rasmodius Web Frontend

SvelteKit frontend for the Rasmodius seed finder.

## Development

```bash
npm install
npm run dev
```

## Building

```bash
npm run build      # Builds WASM + frontend
npm run preview    # Preview production build
```

## Testing

```bash
npm test           # Unit tests (Vitest)
npm run test:e2e   # E2E tests (Playwright)
```

## Key Files

| File | Purpose |
|------|---------|
| `src/routes/+page.svelte` | Main application UI |
| `src/lib/workers/WorkerPool.ts` | Coordinates parallel search workers |
| `src/lib/workers/search.worker.ts` | Thin WASM wrapper (~100 lines) |
| `src/lib/utils/filterToJson.ts` | Converts UI filters to WASM JSON format |
| `src/lib/utils/urlNavigation.ts` | URL state management for undo/redo |
| `src/lib/components/filter-builder/` | Filter UI components |
| `src/lib/components/explore/` | Dynamic explore panel components |

## Architecture

The frontend is intentionally thin:
- UI only builds filters - no evaluation logic
- WorkerPool handles parallelization and global coordination
- Workers are minimal wrappers around WASM `search_range()`
- All heavy computation happens in Rust/WASM

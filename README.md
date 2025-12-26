# Rasmodius

A high-performance Stardew Valley seed finder. Predict daily luck, night events, traveling cart stock, geode contents, mine conditions, and more.

## Credits

- [stardew-predictor](https://github.com/exnil/stardew-predictor) - Reference implementation
- [StardewSeedScripts](https://github.com/SeedFinding/StardewSeedScripts) - Python RNG research

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Svelte 5 UI                             │
│  - Filter building (no evaluation)                          │
│  - Read-only view of search state                           │
│  - Calls WorkerPool.search(filter, range, maxResults)       │
└────────────────────────┬────────────────────────────────────┘
                         │ FilterGroup → JSON
┌────────────────────────▼────────────────────────────────────┐
│                    WorkerPool                               │
│  - Divides seed range across workers                        │
│  - Aggregates progress from all workers                     │
│  - Enforces GLOBAL maxResults (cancels when hit)            │
│  - Handles cancel/restart gracefully                        │
└────────────────────────┬────────────────────────────────────┘
                         │ WorkerRequest/Response
┌────────────────────────▼────────────────────────────────────┐
│                    Web Worker                               │
│  - Loads WASM once on init                                  │
│  - Calls wasm.search_range(filterJson, start, end, ...)     │
│  - Forwards progress/match callbacks to main thread         │
│  - Thin wrapper (~100 lines) - no filter logic              │
└────────────────────────┬────────────────────────────────────┘
                         │ wasm-bindgen
┌────────────────────────▼────────────────────────────────────┐
│                    Rust WASM                                │
│  - search_range(): Parse filter JSON once, tight eval loop  │
│  - predict_day(): All daily mechanics in one call           │
│  - Callbacks for progress (returns false to cancel)         │
└─────────────────────────────────────────────────────────────┘
```

### WASM API

The library exports a minimal, unified API:

| Export | Purpose |
|--------|---------|
| `predict_day(seed, day, version)` | All daily mechanics: luck, dish, weather, night event, cart |
| `predict_geodes(seed, start, count, type, version)` | Geode sequence prediction |
| `find_monster_floors(seed, day, start, end, version)` | Batch monster floor query |
| `find_dark_floors(seed, day, start, end)` | Batch dark floor query |
| `find_mushroom_floors(seed, day, start, end, version)` | Batch mushroom floor query |
| `find_item_in_cart(seed, item, max_days, version)` | Find item across cart days |
| `search_range(filter, start, end, max, version, on_progress, on_match)` | Search with filter |

All mechanics logic lives in `src/mechanics/` and is tested independently. WASM exports are thin wrappers.

### Tech Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| Frontend | Svelte 5 + Runes | Zero runtime overhead, fine-grained reactivity |
| Styling | Tailwind CSS v4 | Zero runtime, JIT compilation |
| Build | Vite + SvelteKit | Fast HMR, native WASM support |
| Compute | Rust → WASM | Best WASM ecosystem, predictable i32 semantics |
| Parallelism | Web Workers | Offload search from main thread |

## Design Decisions

### Why WASM (not pure JavaScript)?

The C# `Random` class uses a 56-element circular buffer with specific initialization constants. JavaScript's `Math.random()` can't replicate this. We need bit-exact reproduction of:
- 21-multiplicative stride initialization
- 4 shuffle passes with modular arithmetic
- Subtractive generator with specific wrap-around behavior

Rust compiles to WASM with predictable integer semantics matching C#.

### Why NOT WebGPU/WebGL?

The game's RNG has heavy branch divergence: nested conditionals, variable-length loops, early exits. GPU compute shaders execute in lockstep—all threads must wait for the longest branch path. For this workload, CPU-based WASM is 10-100x faster than GPU compute.

### Filter Evaluation in WASM

All filter evaluation happens in Rust for maximum performance:

```
Before: JS evaluates filter → calls WASM per-check → 1000s of boundary crossings
After:  JS sends filter JSON → WASM parses once → tight Rust loop → callbacks for results
```

The `search_range()` function:
1. Parses filter JSON once
2. Evaluates filter entirely in Rust
3. Calls JS callback for matches
4. Progress callback returns `false` to cancel (checked every ~10k seeds)

### Global maxResults Enforcement

Workers search different seed ranges in parallel. When total matches across all workers hits `maxResults`, the WorkerPool cancels all workers. This ensures exactly the requested number of results, not `ceil(maxResults/workers) * workers`.

## Project Structure

```
rasmodius/
├── Cargo.toml
├── src/
│   ├── lib.rs              # WASM exports (unified API)
│   ├── types.rs            # Serializable types for WASM↔JS
│   ├── version.rs          # Game version handling
│   ├── rng/
│   │   ├── cs_random.rs    # Full C# Random implementation
│   │   └── cs_random_lite.rs # Optimized 8-call version
│   ├── mechanics/          # Game mechanics (testable core)
│   │   ├── daily_luck.rs
│   │   ├── night_events.rs
│   │   ├── weather.rs
│   │   ├── traveling_cart.rs
│   │   ├── geodes.rs
│   │   └── mine.rs
│   └── search/             # Search kernel
│       ├── mod.rs          # search_range() export
│       ├── filter.rs       # Filter JSON deserialization
│       └── evaluate.rs     # Filter evaluation logic
├── tests/
│   └── comprehensive_golden_tests.rs  # 1.4M test cases
└── web/
    ├── src/
    │   ├── lib/
    │   │   ├── components/     # UI components
    │   │   ├── workers/        # WorkerPool + search.worker
    │   │   ├── types/          # TypeScript types
    │   │   └── utils/          # filterToJson, urlSerializer
    │   └── routes/
    │       └── +page.svelte
    └── e2e/                    # Playwright tests
```

## Development

### Prerequisites

- Rust (via rustup)
- Node.js 20+
- wasm-pack (`cargo install wasm-pack`)

### Build WASM

```bash
wasm-pack build --target web
```

### Run Frontend

```bash
cd web
npm install
npm run dev
```

### Run Tests

```bash
# Rust unit tests (59 tests) + golden tests (5 tests, 1.4M cases)
cargo test

# Frontend unit tests
cd web && npm test

# E2E tests
cd web && npm run test:e2e
```

## Testing Strategy

### Unit Tests
Each mechanics module has unit tests that verify behavior against known seeds:
```rust
#[test]
fn test_daily_luck_day_1() {
    let luck = daily_luck(12345, 1, 0, false);
    assert!((luck - 0.07).abs() < 0.001);
}
```

### Golden Tests
Comprehensive validation against [stardew-predictor](https://github.com/exnil/stardew-predictor):
- 100 seeds × 1120 days × 4 versions
- Night events, cart items, daily luck, dish of day
- Any single mismatch fails the test

### E2E Tests
Playwright tests verify the full stack:
- WASM loads without errors
- UI renders expected data
- Seed search produces results
- URL serialization works

## Version Differences

Key RNG changes across game versions:

| Mechanic | 1.3 | 1.4+ |
|----------|-----|------|
| RNG Seeding | Simple addition | Hash-based |
| Mine Floor Seed | `seed + day + level` | `seed + day + level*100` |
| Geode Warmup | None | 2 loops + Qi logic |
| Night Events | Basic | Primed RNG |

| Mechanic | 1.5 | 1.6 |
|----------|-----|-----|
| Weather | Ginger Island | + Green rain |
| Traveling Cart | Hardcoded list | Data/Shops dynamic |
| Night Events | Primed | + Windstorm |

## License

MIT

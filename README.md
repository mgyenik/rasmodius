# Rasmodius

A high-performance Stardew Valley seed finder. Predict daily luck, night events, traveling cart stock, geode contents, mine conditions, and more.

## Credits

- [stardew-predictor](https://github.com/exnil/stardew-predictor) - Reference implementation
- [StardewSeedScripts](https://github.com/SeedFinding/StardewSeedScripts) - Python RNG research

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Svelte 5 Frontend                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ Filter      │  │ Seed        │  │ Results             │  │
│  │ Builder     │  │ Explorer    │  │ Display             │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│                    Web Worker Pool                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ Worker 1    │  │ Worker 2    │  │ Worker N            │  │
│  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘  │
└─────────┼────────────────┼────────────────────┼─────────────┘
          │ wasm-bindgen   │                    │
┌─────────▼────────────────▼────────────────────▼─────────────┐
│                    Rust WASM Core                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ CSRandom    │  │ Game        │  │ Filter              │  │
│  │ RNG Engine  │  │ Mechanics   │  │ Evaluator           │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Tech Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| Frontend | Svelte 5 + Runes | Zero runtime overhead, fine-grained reactivity |
| Styling | Tailwind CSS v4 | Zero runtime, JIT compilation |
| Build | Vite + SvelteKit | Fast HMR, static adapter, native WASM support |
| Compute | Rust → WASM | Best WASM ecosystem, predictable performance |
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

### Version-Specific Kernels

Stardew Valley's RNG changed between versions (1.3 → 1.4 → 1.5 → 1.6). Rather than checking version inside hot loops:

```rust
// BAD: Branch on every iteration
for seed in 0..u32::MAX {
    if version == "1.6" { ... }  // Slow
}

// GOOD: Dispatch once, tight inner loop
match version {
    V1_6 => search_v16(seeds, filter),
    V1_5 => search_v15(seeds, filter),
    // ...
}
```

This avoids branch misprediction penalties in the critical path.

### Filter Cost Ordering

Filters have varying computational cost:

| Tier | Filters | RNG Calls |
|------|---------|-----------|
| Trivial | Daily luck, night event | 5-30 |
| Light | Geode, dish of day | 1-20 |
| Medium | Traveling cart, mine floors | 50-200 |
| Heavy | Forage spawns | 500+ |

Cheap filters run first to eliminate seeds early, reducing total work.

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

## Project Structure

```
rasmodius/
├── Cargo.toml              # Rust WASM crate config
├── src/                    # Rust source
│   ├── lib.rs              # WASM exports
│   ├── rng/
│   │   └── cs_random.rs    # C# Random implementation
│   └── mechanics/
│       ├── daily_luck.rs
│       ├── night_events.rs
│       ├── weather.rs
│       ├── traveling_cart.rs
│       ├── geodes.rs
│       └── mine.rs
├── tests/                  # Rust tests
└── web/                    # SvelteKit frontend
    ├── src/
    │   ├── lib/
    │   │   ├── components/     # UI components
    │   │   ├── workers/        # Web Worker pool
    │   │   ├── types/          # TypeScript types
    │   │   └── utils/          # Helpers
    │   └── routes/
    │       └── +page.svelte    # Main app
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
# Rust tests
cargo test

# Frontend unit tests
cd web && npm test

# E2E tests
cd web && npm run test:e2e
```

### Full Rebuild

```bash
wasm-pack build --target web && cd web && npm run build
```

## Testing Strategy

### Golden Tests

RNG correctness is validated against [stardew-predictor](https://github.com/exnil/stardew-predictor), a battle-tested JavaScript implementation. We extract expected values for known seeds and verify our Rust implementation matches exactly.

### E2E Tests

Playwright tests verify the full stack:
- WASM loads without errors
- UI renders expected data
- Seed search produces results
- URL parameters work correctly

## License

MIT

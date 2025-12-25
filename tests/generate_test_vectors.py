#!/usr/bin/env python3
"""Generate test vectors from the Python RNG implementation to validate Rust port."""

import sys
sys.path.insert(0, '/home/m/git/StardewSeedScripts')

from CSRandom import CSRandom, CSRandomLite

def generate_csrandom_vectors():
    """Generate test vectors for CSRandom."""
    print("// CSRandom test vectors")
    print("// Format: (seed, [sample1, sample2, ..., sample10])")

    test_seeds = [0, 1, 42, 100, 12345, -1, -100, -638161535, 2147483647, -2147483648]

    for seed in test_seeds:
        rng = CSRandom(seed)
        samples = [rng.Sample() for _ in range(10)]
        print(f"({seed}, {samples}),")

def generate_csrandom_lite_vectors():
    """Generate test vectors for CSRandomLite."""
    print("\n// CSRandomLite test vectors")
    print("// Format: (seed, [sample1, sample2, ..., sample10])")

    test_seeds = [0, 1, 42, 100, 12345, -1, -100, -638161535, 2147483647]

    for seed in test_seeds:
        rng = CSRandomLite(seed)
        samples = [rng.Sample() for _ in range(10)]
        print(f"({seed}, {samples}),")

def generate_next_vectors():
    """Generate test vectors for Next() method."""
    print("\n// CSRandom.Next() test vectors")
    print("// Format: (seed, max_val, [next1, next2, ..., next10])")

    test_cases = [
        (0, 100),
        (12345, 10),
        (42, 1000),
        (-638161535, 50),
    ]

    for seed, max_val in test_cases:
        rng = CSRandom(seed)
        nexts = [rng.Next(max_val) for _ in range(10)]
        print(f"({seed}, {max_val}, {nexts}),")

def generate_rust_test_data():
    """Generate Rust-formatted test data."""
    print("\n// === Rust-formatted test data ===\n")

    print("const CSRANDOM_TEST_VECTORS: &[(i32, [f64; 10])] = &[")
    test_seeds = [0, 1, 42, 100, 12345, -1, -100, -638161535]
    for seed in test_seeds:
        rng = CSRandom(seed)
        samples = [rng.Sample() for _ in range(10)]
        samples_str = ", ".join(f"{s:.16}" for s in samples)
        print(f"    ({seed}, [{samples_str}]),")
    print("];")

    print("\nconst CSRANDOM_LITE_TEST_VECTORS: &[(i32, [f64; 10])] = &[")
    for seed in test_seeds:
        rng = CSRandomLite(seed)
        samples = [rng.Sample() for _ in range(10)]
        samples_str = ", ".join(f"{s:.16}" for s in samples)
        print(f"    ({seed}, [{samples_str}]),")
    print("];")

if __name__ == "__main__":
    generate_csrandom_vectors()
    generate_csrandom_lite_vectors()
    generate_next_vectors()
    generate_rust_test_data()

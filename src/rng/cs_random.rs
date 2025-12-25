use wasm_bindgen::prelude::*;

use super::{MAX_INT, MIN_INT, MSEED};

/// Full implementation of C#'s System.Random
/// This is a subtractive pseudorandom number generator with a 56-element circular buffer.
/// Use this when you need more than ~500 consecutive RNG calls.
#[wasm_bindgen]
#[derive(Clone)]
pub struct CSRandom {
    seed_array: [i32; 56],
    inext: usize,
    inextp: usize,
}

#[wasm_bindgen]
impl CSRandom {
    /// Create a new CSRandom with the given seed
    #[wasm_bindgen(constructor)]
    pub fn new(seed: i32) -> Self {
        let mut seed_array = [0i32; 56];

        // Handle MIN_INT edge case
        let sub = if seed == MIN_INT {
            MAX_INT
        } else {
            seed.abs()
        };

        let mut mj = MSEED.wrapping_sub(sub);
        seed_array[55] = mj;

        let mut mk = 1i32;

        // Initialize using 21-multiplicative stride
        for i in 1..55 {
            let ii = (21 * i) % 55;
            seed_array[ii] = mk;
            mk = mj.wrapping_sub(mk);
            if mk < 0 {
                mk = mk.wrapping_add(MAX_INT);
            }
            mj = seed_array[ii];
        }

        // 4-pass shuffle
        for _ in 0..4 {
            for i in 1..56 {
                let idx = 1 + (i + 30) % 55;
                seed_array[i] = seed_array[i].wrapping_sub(seed_array[idx]);
                while seed_array[i] < 0 {
                    seed_array[i] = seed_array[i].wrapping_add(MAX_INT);
                }
            }
        }

        Self {
            seed_array,
            inext: 0,
            inextp: 21,
        }
    }

    /// Generate a raw integer sample (internal use)
    #[inline]
    fn sample_raw(&mut self) -> i32 {
        // Increment indices with wraparound
        self.inext = if self.inext + 1 >= 56 {
            1
        } else {
            self.inext + 1
        };
        self.inextp = if self.inextp + 1 >= 56 {
            1
        } else {
            self.inextp + 1
        };

        // Subtractive generation
        let mut ret_val = self.seed_array[self.inext].wrapping_sub(self.seed_array[self.inextp]);

        if ret_val > MAX_INT {
            ret_val = ret_val.wrapping_sub(MAX_INT);
        }
        if ret_val == MAX_INT {
            ret_val -= 1;
        }
        if ret_val < 0 {
            ret_val = ret_val.wrapping_add(MAX_INT);
        }

        // Store value back into buffer
        self.seed_array[self.inext] = ret_val;

        ret_val
    }

    /// Long-range sample with sign extension (for ranges over MAX_INT)
    #[inline]
    fn sample_lr(&mut self) -> f64 {
        let res = self.sample_raw();
        let sign = if self.sample_raw() % 2 == 0 { -1 } else { 1 };
        let res = res * sign;
        (res as f64 + MAX_INT as f64 - 1.0) / (2.0 * MAX_INT as f64 - 1.0)
    }

    /// Returns a random float in [0, 1)
    #[wasm_bindgen]
    pub fn sample(&mut self) -> f64 {
        self.sample_raw() as f64 * (1.0 / MAX_INT as f64)
    }

    /// Returns a random integer based on parameters:
    /// - next() -> raw integer [0, MAX_INT)
    /// - next(max) -> integer in [0, max)
    /// - next(min, max) -> integer in [min, max)
    #[wasm_bindgen]
    pub fn next(&mut self, min_val: Option<i32>, max_val: Option<i32>) -> i32 {
        match (min_val, max_val) {
            (None, None) => {
                // Return raw sample
                self.sample_raw()
            }
            (Some(max), None) => {
                // [0, max)
                (self.sample() * max as f64) as i32
            }
            (Some(min), Some(max)) => {
                // [min, max)
                let range = (max - min) as i64;
                if range <= MAX_INT as i64 {
                    (range as f64 * self.sample()) as i32 + min
                } else {
                    (range as f64 * self.sample_lr()) as i32 + min
                }
            }
            (None, Some(_)) => {
                // Invalid - treat as raw sample
                self.sample_raw()
            }
        }
    }

    /// Convenience method: next with single max parameter
    #[wasm_bindgen]
    pub fn next_max(&mut self, max: i32) -> i32 {
        (self.sample() * max as f64) as i32
    }

    /// Convenience method: next with min and max parameters
    #[wasm_bindgen]
    pub fn next_range(&mut self, min: i32, max: i32) -> i32 {
        let range = (max - min) as i64;
        if range <= MAX_INT as i64 {
            (range as f64 * self.sample()) as i32 + min
        } else {
            (range as f64 * self.sample_lr()) as i32 + min
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_csrandom_seed_0() {
        // From Python: CSRandom(0).Sample() = 0.72624326996795985
        let mut rng = CSRandom::new(0);
        let sample = rng.sample();
        assert!(
            (sample - 0.7262432699679598).abs() < 1e-10,
            "Expected ~0.7262432699679598, got {}",
            sample
        );
    }

    #[test]
    fn test_csrandom_multiple_samples() {
        // From Python comments:
        // CSRandom(0).Sample().Sample() = 0.8173253595909687
        let mut rng = CSRandom::new(0);
        let _ = rng.sample(); // First call
        let sample2 = rng.sample(); // Second call
        assert!(
            (sample2 - 0.8173253595909687).abs() < 1e-10,
            "Expected ~0.8173253595909687, got {}",
            sample2
        );
    }

    #[test]
    fn test_csrandom_seed_linear_property() {
        // From Python: CSRandom(i).Sample() = CSRandom(0).Sample() + i * 0.52242531418913285
        let base = CSRandom::new(0).sample();
        let offset = 0.5224253141891330;

        for i in 1..10 {
            let mut rng = CSRandom::new(i);
            let expected = (base + i as f64 * offset) % 1.0;
            let actual = rng.sample();
            assert!(
                (actual - expected).abs() < 1e-10,
                "Seed {}: expected {}, got {}",
                i,
                expected,
                actual
            );
        }
    }

    #[test]
    fn test_csrandom_negative_seed() {
        // Test with negative seed
        let mut rng = CSRandom::new(-638161535);
        let sample = rng.sample();
        // Should produce a valid float in [0, 1)
        assert!(sample >= 0.0 && sample < 1.0);
    }

    #[test]
    fn test_csrandom_next_range() {
        let mut rng = CSRandom::new(12345);
        for _ in 0..100 {
            let val = rng.next_range(5, 15);
            assert!(val >= 5 && val < 15, "Value {} out of range [5, 15)", val);
        }
    }
}

mod cs_random;
mod cs_random_lite;
#[cfg(test)]
mod validation_tests;

pub use cs_random::CSRandom;
pub use cs_random_lite::CSRandomLite;

/// Constants used across RNG implementations
pub const MAX_INT: i32 = 0x7FFFFFFF; // 2,147,483,647
pub const MIN_INT: i32 = -2147483648; // 0x80000000 as signed
pub const MSEED: i32 = 0x09A4EC86; // 161803398

/// Simulates 32-bit signed integer overflow behavior (matching C#)
#[inline]
pub fn int_overflow(val: i64) -> i32 {
    // Wrap to 32-bit signed range [-2147483648, 2147483647]
    let max = MAX_INT as i64;
    if val >= -max - 1 && val <= max {
        val as i32
    } else {
        let range = 2 * (max + 1);
        (((val + max + 1) % range + range) % range - max - 1) as i32
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_int_overflow() {
        // Test normal values pass through
        assert_eq!(int_overflow(0), 0);
        assert_eq!(int_overflow(100), 100);
        assert_eq!(int_overflow(-100), -100);
        assert_eq!(int_overflow(MAX_INT as i64), MAX_INT);
        assert_eq!(int_overflow(MIN_INT as i64), MIN_INT);

        // Test overflow wrapping
        assert_eq!(int_overflow(MAX_INT as i64 + 1), MIN_INT);
        assert_eq!(int_overflow(MIN_INT as i64 - 1), MAX_INT);
    }
}

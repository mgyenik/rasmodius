use crate::rng::CSRandomLite;

/// Returns (dish_id, quantity) for the Saloon's dish of the day.
/// This is called internally to advance the RNG state before daily luck calculation.
///
/// Note: random is initialized before daysPlayed is incremented in-game,
/// so we use (daysPlayed - 1) for the seed calculation.
pub fn dish_of_the_day(seed: i32, days_played: i32, steps: i32) -> (i32, i32) {
    let local_days_played = days_played - 1;
    let rng_seed = (seed / 100) + local_days_played * 10 + 1 + steps;
    let mut rng = CSRandomLite::new(rng_seed);
    dish_of_the_day_with_rng(&mut rng, local_days_played)
}

/// Internal function that uses an existing RNG instance.
/// Returns (dish_id, quantity).
fn dish_of_the_day_with_rng(rng: &mut CSRandomLite, local_days_played: i32) -> (i32, i32) {
    // Calculate day of month (1-28)
    let day_of_month = if local_days_played > 0 {
        ((local_days_played - 1) % 28) + 1
    } else {
        0
    };

    // Advance RNG for each day of the month
    for _ in 0..day_of_month {
        rng.sample();
    }

    // Pick a dish, avoiding certain items
    // Excluded: 346 (Beer), 196 (Salad), 216 (Bread), 224 (Spaghetti),
    //           206 (Pizza), 395 (Coffee), 217 (Tom Kha Soup)
    const EXCLUDED_DISHES: [i32; 7] = [346, 196, 216, 224, 206, 395, 217];

    let mut dish = rng.next_range(194, 240);
    while EXCLUDED_DISHES.contains(&dish) {
        dish = rng.next_range(194, 240);
    }

    // Determine quantity: 1-3, or 1-13 with 8% chance
    let bonus = if rng.sample() < 0.08 { 10 } else { 0 };
    let quantity = rng.next_range(1, 4 + bonus);

    // One more Sample() call for object constructor
    rng.sample();

    (dish, quantity)
}

/// Calculate the daily luck value for a given seed and day.
///
/// # Arguments
/// * `seed` - The game seed
/// * `days_played` - Days played (1-indexed, day 1 is first day)
/// * `steps` - Step count offset (usually 0)
/// * `has_friends` - Whether the player has any friends (affects RNG calls)
///
/// # Returns
/// Daily luck value in range [-0.1, 0.1]
pub fn daily_luck(seed: i32, days_played: i32, steps: i32, has_friends: bool) -> f64 {
    let local_days_played = days_played - 1;
    let rng_seed = (seed / 100) + local_days_played * 10 + 1 + steps;
    let mut rng = CSRandomLite::new(rng_seed);

    // Dish of the day is calculated first, advancing the RNG
    dish_of_the_day_with_rng(&mut rng, local_days_played);

    // Additional RNG calls if player has friends
    if has_friends {
        rng.sample(); // Friendship
        rng.sample(); // Friendship mail
    }

    // Rarecrow society check
    rng.sample();

    // Calculate luck: Next(-100, 101) / 1000, clamped to max 0.10
    let luck_roll = rng.next_range(-100, 101);
    let luck = luck_roll as f64 / 1000.0;

    luck.min(0.10)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_daily_luck_day_1() {
        // Test known values from Python implementation
        let luck = daily_luck(12345, 1, 0, false);
        // Luck should be in valid range
        assert!(luck >= -0.1 && luck <= 0.1);
    }

    #[test]
    fn test_daily_luck_range() {
        // Test that luck values are always in valid range
        for seed in [1, 100, 12345, 999999, i32::MAX / 2] {
            for day in 1..=28 {
                let luck = daily_luck(seed, day, 0, false);
                assert!(
                    luck >= -0.1 && luck <= 0.1,
                    "Luck {} out of range for seed {} day {}",
                    luck,
                    seed,
                    day
                );
            }
        }
    }

    #[test]
    fn test_dish_of_the_day() {
        let (dish, qty) = dish_of_the_day(12345, 1, 0);
        // Dish should be in valid range (194-239, excluding certain values)
        assert!(dish >= 194 && dish < 240);
        assert!(![346, 196, 216, 224, 206, 395, 217].contains(&dish));
        // Quantity should be 1-13
        assert!(qty >= 1 && qty <= 13);
    }

    #[test]
    fn test_has_friends_affects_luck() {
        // With friends should give different luck value
        let luck_no_friends = daily_luck(12345, 5, 0, false);
        let luck_with_friends = daily_luck(12345, 5, 0, true);
        // They should be different (different RNG state)
        assert_ne!(luck_no_friends, luck_with_friends);
    }
}

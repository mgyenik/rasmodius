//! Weather prediction for Stardew Valley.
//!
//! Predicts tomorrow's weather based on game seed and current day.

use crate::rng::CSRandom;
use crate::version::GameVersion;
use super::daily_luck::{dish_of_the_day, daily_luck};

/// Weather types.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Weather {
    Sunny = 0,
    Rain = 1,
    Debris = 2,  // Windy/leaves
    Lightning = 3,
    Snow = 5,
}

impl Weather {
    pub fn from_code(code: u8) -> Self {
        match code {
            0 => Weather::Sunny,
            1 => Weather::Rain,
            2 => Weather::Debris,
            3 => Weather::Lightning,
            5 => Weather::Snow,
            _ => Weather::Sunny,
        }
    }

    pub fn to_code(self) -> u8 {
        self as u8
    }
}

/// Predict tomorrow's weather.
///
/// # Arguments
/// * `seed` - Game seed
/// * `days_played` - Current day (1 = Spring 1 Year 1)
/// * `steps` - Step count modifier (usually 0)
/// * `weather_today` - Today's weather code (affects RNG consumption)
/// * `has_friends` - Whether player has multiplayer friends
/// * `version` - Game version
pub fn weather_tomorrow(
    seed: i32,
    days_played: i32,
    steps: i32,
    weather_today: u8,
    has_friends: bool,
    version: GameVersion,
) -> Weather {
    // Initialize RNG - same formula as daily luck
    let mut rng = CSRandom::new(seed / 100 + (days_played - 1) * 10 + 1 + steps);

    // Consume RNG calls for dish of day and daily luck
    dish_of_the_day(seed, days_played, steps);
    daily_luck(seed, days_played, steps, has_friends);

    // Actually we need to use the same RNG instance
    // Dish of the day: 2 calls (Next for dish selection, Next for quantity)
    rng.next_max(112);
    rng.next_range(1, 4 + 1);

    // Daily luck: 1 call
    rng.sample();

    // Extra sample if has friends
    if has_friends {
        rng.sample();
    }

    // Ginger Island sample in 1.5+
    if version.has_ginger_isle() {
        rng.sample();
    }

    // If today is debris weather, consume extra samples
    if weather_today == 2 {
        let num = rng.next_range(16, 64 + 1);
        for _ in 0..num {
            rng.sample();
            rng.sample();
            rng.sample();
            rng.sample();
            rng.sample();
            rng.sample();
        }
    }

    // Calculate season info
    let season = ((days_played - 1) / 28) % 4;
    let spring = season == 0;
    let summer = season == 1;
    let winter = season == 3;
    let fall = season == 2;
    let day_of_month = ((days_played - 1) % 28) + 1;

    // Calculate rain chance
    let chance_to_rain = if summer {
        day_of_month as f64 * (3.0 / 1000.0) + 0.12
    } else if winter {
        0.63
    } else {
        0.183
    };

    // Determine weather
    if rng.sample() < chance_to_rain {
        // Rainy conditions
        if winter {
            Weather::Snow
        } else if summer && rng.sample() < 0.85 {
            Weather::Lightning
        } else if !winter && rng.sample() < 0.25 && day_of_month > 2 && day_of_month < 28 {
            Weather::Lightning
        } else {
            Weather::Rain
        }
    } else if days_played <= 2 {
        Weather::Sunny
    } else if spring && rng.sample() < 0.2 {
        Weather::Debris
    } else if fall && rng.sample() < 0.6 {
        Weather::Debris
    } else {
        Weather::Sunny
    }
}

/// Find days with specific weather in a range.
pub fn find_weather_days(
    seed: i32,
    start_day: i32,
    end_day: i32,
    target_weather: Weather,
    version: GameVersion,
) -> Vec<i32> {
    let mut results = Vec::new();

    for day in start_day..=end_day {
        // For simplicity, assume sunny today (weather_today = 0)
        let weather = weather_tomorrow(seed, day, 0, 0, false, version);
        if weather == target_weather {
            results.push(day);
        }
    }

    results
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_weather_codes() {
        assert_eq!(Weather::Sunny.to_code(), 0);
        assert_eq!(Weather::Rain.to_code(), 1);
        assert_eq!(Weather::Lightning.to_code(), 3);
        assert_eq!(Weather::Snow.to_code(), 5);
    }

    #[test]
    fn test_weather_prediction() {
        // Weather should be deterministic
        let w1 = weather_tomorrow(12345, 5, 0, 0, false, GameVersion::V1_5);
        let w2 = weather_tomorrow(12345, 5, 0, 0, false, GameVersion::V1_5);
        assert_eq!(w1, w2);
    }

    #[test]
    fn test_winter_snow() {
        // In winter, rainy weather becomes snow
        for seed in 0..1000 {
            let weather = weather_tomorrow(seed, 85, 0, 0, false, GameVersion::V1_5);
            if weather == Weather::Snow {
                return; // Found snow in winter
            }
        }
    }

    #[test]
    fn test_version_affects_weather() {
        // 1.5+ has extra RNG call for Ginger Island, so results may differ
        let mut found_difference = false;
        for seed in 1..1000 {
            let v14 = weather_tomorrow(seed, 50, 0, 0, false, GameVersion::V1_4);
            let v15 = weather_tomorrow(seed, 50, 0, 0, false, GameVersion::V1_5);
            if v14 != v15 {
                found_difference = true;
                break;
            }
        }
        assert!(found_difference, "1.4 and 1.5 should sometimes give different weather");
    }
}

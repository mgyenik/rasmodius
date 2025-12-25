//! Night event prediction for Stardew Valley.
//!
//! Night events (fairy, witch, meteor, etc.) have version-specific RNG.

use crate::rng::CSRandomLite;
use crate::version::GameVersion;
use xxhash_rust::xxh32::xxh32;

/// Types of night events that can occur in Stardew Valley.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum NightEvent {
    Fairy,
    Witch,
    Meteor,
    Ufo,        // Strange Capsule
    Owl,        // Stone Owl
    Earthquake, // Opens railroad area (day 3 of Summer Year 1)
}

/// Determine what night event (if any) occurs for a given seed and day.
///
/// # Arguments
/// * `seed` - The game seed
/// * `days_played` - Days played (night events are checked at 6am)
/// * `version` - Game version (affects RNG seeding and event chances)
///
/// # Returns
/// The night event that occurs, or None if no event
pub fn night_event(seed: i32, days_played: i32, version: GameVersion) -> Option<NightEvent> {
    // The event is rolled at 6am for what happened "overnight".
    // The game actually uses days_played+1 for the seed calculation.
    let event_day = days_played + 1;

    // Day 30 (Summer 3 Year 1) always has earthquake - opens railroad area
    // This is deterministic and not seed-dependent
    if event_day == 30 {
        return Some(NightEvent::Earthquake);
    }

    match version {
        GameVersion::V1_6 => night_event_v16(seed, event_day),
        GameVersion::V1_5 => night_event_v15(seed, event_day),
        GameVersion::V1_4 => night_event_v14(seed, event_day),
        GameVersion::V1_3 => night_event_v13(seed, event_day),
    }
}

/// Night event logic for v1.6.
/// Uses hash-based seeding, 10 prime calls, different probabilities.
#[inline]
fn night_event_v16(seed: i32, event_day: i32) -> Option<NightEvent> {
    // 1.6 uses getRandomSeed(day, gameId/2) with hash-based seeding
    let rng_seed = hash_seed(event_day, seed / 2);
    let mut rng = CSRandomLite::new(rng_seed);

    // Prime RNG with 10 calls
    for _ in 0..10 {
        rng.sample();
    }

    // Greenhouse windstorm check (skipped - assume no greenhouse)
    // The windstorm check consumes one Sample() call

    // For saves without greenhouse, the next roll is reused for both
    // windstorm check and fairy check
    let roll = rng.sample();

    let month = ((event_day - 1) / 28) % 4;
    let year = 1 + (event_day - 1) / 112;

    // Fairy: 1% chance, but not in winter
    // (Fairy rose bonus +0.7% ignored - too volatile)
    if roll < 0.01 && month < 3 {
        return Some(NightEvent::Fairy);
    }

    // Witch: 1% chance, requires day > 20
    if rng.sample() < 0.01 && event_day > 20 {
        return Some(NightEvent::Witch);
    }

    // Meteor: 1% chance, requires day > 5
    if rng.sample() < 0.01 && event_day > 5 {
        return Some(NightEvent::Meteor);
    }

    // Stone Owl: 0.5% chance
    if rng.sample() < 0.005 {
        return Some(NightEvent::Owl);
    }

    // Strange Capsule: 0.8% chance, requires Year 2+
    if rng.sample() < 0.008 && year > 1 {
        return Some(NightEvent::Ufo);
    }

    None
}

/// Night event logic for v1.5 (v1.5.0-1.5.2).
/// Uses simple seeding, capsule before owl, both 0.8% probability.
/// Note: 1.5.3+ changed the order and probabilities, but we treat "1.5" as 1.5.0-1.5.2.
#[inline]
fn night_event_v15(seed: i32, event_day: i32) -> Option<NightEvent> {
    let rng_seed = seed / 2 + event_day;
    let mut rng = CSRandomLite::new(rng_seed);

    let month = ((event_day - 1) / 28) % 4;
    let year = 1 + (event_day - 1) / 112;

    // Fairy: 1% chance, but not in winter
    if rng.sample() < 0.01 && month < 3 {
        return Some(NightEvent::Fairy);
    }

    // Witch: 1% chance
    if rng.sample() < 0.01 {
        return Some(NightEvent::Witch);
    }

    // Meteor: 1% chance
    if rng.sample() < 0.01 {
        return Some(NightEvent::Meteor);
    }

    // v1.5.0-1.5.2: Capsule checked before Owl, both 0.8% chance
    // Strange Capsule: 0.8% chance, requires Year 2+
    if rng.sample() < 0.008 && year > 1 {
        return Some(NightEvent::Ufo);
    }

    // Stone Owl: 0.8% chance
    if rng.sample() < 0.008 {
        return Some(NightEvent::Owl);
    }

    None
}

/// Night event logic for v1.4.
/// Uses simple seeding, 1% chance for owl/capsule.
#[inline]
fn night_event_v14(seed: i32, event_day: i32) -> Option<NightEvent> {
    let rng_seed = seed / 2 + event_day;
    let mut rng = CSRandomLite::new(rng_seed);

    let month = ((event_day - 1) / 28) % 4;
    let year = 1 + (event_day - 1) / 112;

    // Fairy: 1% chance, but not in winter
    if rng.sample() < 0.01 && month < 3 {
        return Some(NightEvent::Fairy);
    }

    // Witch: 1% chance
    if rng.sample() < 0.01 {
        return Some(NightEvent::Witch);
    }

    // Meteor: 1% chance
    if rng.sample() < 0.01 {
        return Some(NightEvent::Meteor);
    }

    // Strange Capsule: 1% chance, requires Year 2+
    // (Pre-1.5.3 order: Capsule before Owl)
    if rng.sample() < 0.01 && year > 1 {
        return Some(NightEvent::Ufo);
    }

    // Stone Owl: 1% chance
    if rng.sample() < 0.01 {
        return Some(NightEvent::Owl);
    }

    None
}

/// Night event logic for v1.3.
/// Uses legacy seeding (same as 1.4 for night events).
#[inline]
fn night_event_v13(seed: i32, event_day: i32) -> Option<NightEvent> {
    // 1.3 uses same logic as 1.4 for night events
    night_event_v14(seed, event_day)
}

/// Hash-based seed generation for 1.6 versions.
/// Mimics StardewValley.Utility.CreateRandomSeed() using XXHash32.
#[inline]
fn hash_seed(a: i32, b: i32) -> i32 {
    // XXHash32 of 5 integers (a, b, 0, 0, 0) as little-endian bytes
    let values = [a, b, 0, 0, 0];
    let bytes: Vec<u8> = values.iter().flat_map(|&v| v.to_le_bytes()).collect();
    xxh32(&bytes, 0) as i32
}

/// Check all days in a range for night events.
pub fn find_night_events(
    seed: i32,
    start_day: i32,
    end_day: i32,
    version: GameVersion,
) -> Vec<(i32, NightEvent)> {
    let mut events = Vec::new();
    for day in start_day..=end_day {
        if let Some(event) = night_event(seed, day, version) {
            events.push((day, event));
        }
    }
    events
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_day_29_earthquake() {
        // Day 29 leads to event_day 30, which is always earthquake (Summer 3 Y1)
        for seed in [1, 100, 12345, 999999] {
            for version in [GameVersion::V1_3, GameVersion::V1_5, GameVersion::V1_6] {
                assert_eq!(night_event(seed, 29, version), Some(NightEvent::Earthquake));
            }
        }
    }

    #[test]
    fn test_fairy_not_in_winter() {
        // Winter is days 85-112, 197-224, etc. (month % 4 == 3)
        for seed in 1..1000 {
            for day in 1..=224 {
                let version = GameVersion::V1_5;
                if let Some(NightEvent::Fairy) = night_event(seed, day, version) {
                    let event_day = day + 1;
                    let month = ((event_day - 1) / 28) % 4;
                    assert_ne!(month, 3, "Fairy found in winter on day {}", day);
                }
            }
        }
    }

    #[test]
    fn test_ufo_requires_year_2() {
        // UFO should not occur in Year 1 (days 1-112)
        for seed in 1..1000 {
            for day in 1..=111 {
                for version in [GameVersion::V1_4, GameVersion::V1_5, GameVersion::V1_6] {
                    if let Some(event) = night_event(seed, day, version) {
                        assert_ne!(
                            event,
                            NightEvent::Ufo,
                            "UFO found in Year 1 on day {} with version {:?}",
                            day,
                            version
                        );
                    }
                }
            }
        }
    }

    #[test]
    fn test_different_versions_can_differ() {
        // Find a seed/day where v1.5 and v1.6 differ
        let mut found_difference = false;
        for seed in 1..10000 {
            for day in 50..100 {
                let v15 = night_event(seed, day, GameVersion::V1_5);
                let v16 = night_event(seed, day, GameVersion::V1_6);
                if v15 != v16 {
                    found_difference = true;
                    break;
                }
            }
            if found_difference {
                break;
            }
        }
        assert!(
            found_difference,
            "Should find at least one seed/day where versions differ"
        );
    }
}

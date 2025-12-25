//! Mine floor prediction for Stardew Valley.
//!
//! Implements floor condition checks: monster floors, dark floors, mushroom floors,
//! remixed mine chests, and mine spot loot.

use crate::rng::CSRandomLite;
use crate::version::GameVersion;

/// Result of checking a mine floor's conditions.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct FloorConditions {
    pub is_monster_floor: bool,
    pub is_dark_floor: bool,
    pub is_mushroom_floor: bool,
}

/// Check if a floor is a monster/infested floor.
///
/// Monster floors have increased enemy spawns and no resources.
pub fn is_monster_floor(seed: i32, days_played: i32, level: i32, version: GameVersion) -> bool {
    // Every 5th floor is a checkpoint - never a monster floor
    if level % 5 == 0 {
        return false;
    }
    // First few floors of each section are safe
    if level % 40 < 5 {
        return false;
    }
    // Last floors before checkpoint are safe
    if level % 40 > 30 {
        return false;
    }
    // Floor 19 in each section is never a monster floor
    if level % 40 == 19 {
        return false;
    }

    match version {
        GameVersion::V1_3 => is_monster_floor_v13(seed, days_played, level),
        _ => is_monster_floor_v14_plus(seed, days_played, level),
    }
}

/// Monster floor check for v1.3 (legacy seeding).
#[inline]
fn is_monster_floor_v13(seed: i32, days_played: i32, level: i32) -> bool {
    let rng_seed = seed / 2 + days_played + level;
    let mut rng = CSRandomLite::new(rng_seed);
    rng.sample() < 0.044
}

/// Monster floor check for v1.4+ (uses level * 100 for better distribution).
#[inline]
fn is_monster_floor_v14_plus(seed: i32, days_played: i32, level: i32) -> bool {
    let rng_seed = seed / 2 + days_played + level * 100;
    let mut rng = CSRandomLite::new(rng_seed);
    rng.sample() < 0.044
}

/// Check if a floor has unusual darkness.
///
/// Dark floors have reduced visibility.
/// Note: This doesn't vary by version.
pub fn is_unusual_dark_floor(seed: i32, days_played: i32, level: i32) -> bool {
    // Every 10th floor is never dark
    if level % 10 == 0 {
        return false;
    }
    // Last floors before checkpoint are never dark
    if level % 40 > 30 {
        return false;
    }

    let rng_seed = days_played * level + 4 * level + seed / 2;
    let mut rng = CSRandomLite::new(rng_seed);

    // 30% chance if level > 2
    if rng.sample() < 0.3 && level > 2 {
        return true;
    }
    // Additional 15% chance if level > 5 and not floor 120
    if rng.sample() < 0.15 && level > 5 && level != 120 {
        return true;
    }

    false
}

/// Check if a floor is a mushroom floor.
///
/// Mushroom floors have purple mushrooms and unique aesthetics.
/// Only possible on floors 81-120.
pub fn is_mushroom_floor(seed: i32, days_played: i32, floor: i32, version: GameVersion) -> bool {
    // Every 5th floor is never a mushroom floor
    if floor % 5 == 0 {
        return false;
    }

    // Monster floors can't be mushroom floors
    if is_monster_floor(seed, days_played, floor, version) {
        return false;
    }

    match version {
        GameVersion::V1_3 => is_mushroom_floor_v13(seed, days_played, floor),
        _ => is_mushroom_floor_v14_plus(seed, days_played, floor),
    }
}

/// Mushroom floor check for v1.3 (legacy seeding).
#[inline]
fn is_mushroom_floor_v13(seed: i32, days_played: i32, floor: i32) -> bool {
    let rng_seed = seed / 2 + floor + days_played;
    let mut rng = CSRandomLite::new(rng_seed);

    // Skip some samples based on conditions
    let num = rng.sample();
    if num < 0.3 && floor > 2 {
        rng.sample();
    }
    rng.sample();

    // 3.5% chance, only on floors 81+
    rng.sample() < 0.035 && floor > 80
}

/// Mushroom floor check for v1.4+ (different seeding).
#[inline]
fn is_mushroom_floor_v14_plus(seed: i32, days_played: i32, floor: i32) -> bool {
    let rng_seed = days_played * floor + 4 * floor + seed / 2;
    let mut rng = CSRandomLite::new(rng_seed);

    // Skip some samples based on conditions
    let num = rng.sample();
    if num < 0.3 && floor > 2 {
        rng.sample();
    }
    rng.sample();

    // 3.5% chance, only on floors 81+
    rng.sample() < 0.035 && floor > 80
}

/// Get all floor conditions at once for efficiency.
pub fn get_floor_conditions(
    seed: i32,
    days_played: i32,
    level: i32,
    version: GameVersion,
) -> FloorConditions {
    let is_monster = is_monster_floor(seed, days_played, level, version);
    let is_dark = is_unusual_dark_floor(seed, days_played, level);
    let is_mushroom = if is_monster {
        false // Can't be both
    } else {
        is_mushroom_floor(seed, days_played, level, version)
    };

    FloorConditions {
        is_monster_floor: is_monster,
        is_dark_floor: is_dark,
        is_mushroom_floor: is_mushroom,
    }
}

/// Find all monster floors in a range.
pub fn find_monster_floors(
    seed: i32,
    days_played: i32,
    start_floor: i32,
    end_floor: i32,
    version: GameVersion,
) -> Vec<i32> {
    (start_floor..=end_floor)
        .filter(|&floor| is_monster_floor(seed, days_played, floor, version))
        .collect()
}

/// Find all dark floors in a range.
pub fn find_dark_floors(
    seed: i32,
    days_played: i32,
    start_floor: i32,
    end_floor: i32,
) -> Vec<i32> {
    (start_floor..=end_floor)
        .filter(|&floor| is_unusual_dark_floor(seed, days_played, floor))
        .collect()
}

/// Find all mushroom floors in a range.
pub fn find_mushroom_floors(
    seed: i32,
    days_played: i32,
    start_floor: i32,
    end_floor: i32,
    version: GameVersion,
) -> Vec<i32> {
    (start_floor..=end_floor)
        .filter(|&floor| is_mushroom_floor(seed, days_played, floor, version))
        .collect()
}

/// Item type for remixed mine chest contents.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ChestItemType {
    Boots,
    MeleeWeapon,
    Ring,
}

/// Remixed mine chest item.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct ChestItem {
    pub item_type: ChestItemType,
    pub item_id: i32,
}

/// Get the contents of a remixed mines treasure chest.
///
/// Only specific floors have these: 10, 20, 50, 60, 80, 90, 110
pub fn remixed_mines_chest(seed: i32, floor: i32) -> Option<ChestItem> {
    let items: Vec<(ChestItemType, i32)> = match floor {
        10 => vec![
            (ChestItemType::Boots, 506),
            (ChestItemType::Boots, 507),
            (ChestItemType::MeleeWeapon, 12),
            (ChestItemType::MeleeWeapon, 17),
            (ChestItemType::MeleeWeapon, 22),
            (ChestItemType::MeleeWeapon, 31),
        ],
        20 => vec![
            (ChestItemType::MeleeWeapon, 11),
            (ChestItemType::MeleeWeapon, 24),
            (ChestItemType::MeleeWeapon, 20),
            (ChestItemType::Ring, 517),
            (ChestItemType::Ring, 519),
        ],
        50 => vec![
            (ChestItemType::Boots, 509),
            (ChestItemType::Boots, 510),
            (ChestItemType::Boots, 508),
            (ChestItemType::MeleeWeapon, 1),
            (ChestItemType::MeleeWeapon, 43),
        ],
        60 => vec![
            (ChestItemType::MeleeWeapon, 21),
            (ChestItemType::MeleeWeapon, 44),
            (ChestItemType::MeleeWeapon, 6),
            (ChestItemType::MeleeWeapon, 18),
            (ChestItemType::MeleeWeapon, 27),
        ],
        80 => vec![
            (ChestItemType::Boots, 512),
            (ChestItemType::Boots, 511),
            (ChestItemType::MeleeWeapon, 10),
            (ChestItemType::MeleeWeapon, 7),
            (ChestItemType::MeleeWeapon, 46),
            (ChestItemType::MeleeWeapon, 19),
        ],
        90 => vec![
            (ChestItemType::MeleeWeapon, 8),
            (ChestItemType::MeleeWeapon, 52),
            (ChestItemType::MeleeWeapon, 45),
            (ChestItemType::MeleeWeapon, 5),
            (ChestItemType::MeleeWeapon, 60),
        ],
        110 => vec![
            (ChestItemType::Boots, 514),
            (ChestItemType::Boots, 878),
            (ChestItemType::MeleeWeapon, 50),
            (ChestItemType::MeleeWeapon, 28),
        ],
        _ => return None,
    };

    let rng_seed = seed.wrapping_mul(512).wrapping_add(floor);
    let mut rng = CSRandomLite::new(rng_seed);
    let index = rng.next_range(0, items.len() as i32) as usize;

    let (item_type, item_id) = items[index];
    Some(ChestItem { item_type, item_id })
}

/// Check what items spawn at a mine rock spot.
pub fn check_mines_spot(
    seed: i32,
    ladder: bool,
    geologist: bool,
    excavator: bool,
    floor: i32,
) -> Vec<i32> {
    let mut objects = Vec::new();
    let mut rng = CSRandomLite::new(seed);

    rng.sample();

    if !ladder {
        rng.sample();
    }

    if geologist {
        rng.sample();
    }

    // Geode chance (increased with excavator)
    let geode_chance = 0.022 * (1.0 + if excavator { 1.0 } else { 0.0 });
    if rng.sample() < geode_chance {
        if geologist && rng.sample() < 0.5 {
            objects.push(535); // Extra geode
        }
        objects.push(535); // Geode
    }

    // Frozen geode chance
    let frozen_chance = 0.005 * (1.0 + if excavator { 1.0 } else { 0.0 });
    if rng.sample() < frozen_chance {
        if geologist && rng.sample() < 0.5 {
            objects.push(749); // Extra frozen geode
        }
        objects.push(749); // Frozen geode
    }

    // Ore/gem chance (5%)
    if rng.sample() < 0.05 {
        rng.sample();
        rng.sample();

        if rng.sample() < 0.25 {
            objects.push(382); // Coal
        }

        // Ore based on floor depth
        if floor < 40 {
            if floor >= 20 && rng.sample() < 0.1 {
                objects.push(380); // Iron ore
            } else {
                objects.push(378); // Copper ore
            }
        } else if floor < 80 {
            if floor >= 60 && rng.sample() < 0.1 {
                objects.push(384); // Gold ore
            } else if rng.sample() >= 0.75 {
                objects.push(378); // Copper ore
            } else {
                objects.push(380); // Iron ore
            }
        } else if floor < 120 {
            if rng.sample() >= 0.75 {
                if rng.sample() >= 0.75 {
                    objects.push(378); // Copper ore
                } else {
                    objects.push(380); // Iron ore
                }
            } else {
                objects.push(384); // Gold ore
            }
        } else {
            // Floor 120+
            if rng.sample() < 0.01 + (floor - 120) as f64 / 2000.0 {
                objects.push(386); // Iridium ore
            } else if rng.sample() >= 0.75 {
                if rng.sample() >= 0.75 {
                    objects.push(378); // Copper ore
                } else {
                    objects.push(380); // Iron ore
                }
            } else {
                objects.push(384); // Gold ore
            }
        }
    }

    objects
}

/// Convenience wrapper that takes x, y coordinates.
pub fn check_mines_spot_at(
    seed: i32,
    floor: i32,
    x: i32,
    y: i32,
    ladder: bool,
    geologist: bool,
    excavator: bool,
) -> Vec<i32> {
    let combined_seed = x * 1000 + y + floor + seed / 2;
    check_mines_spot(combined_seed, ladder, geologist, excavator, floor)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_monster_floor_checkpoint_floors() {
        // Every 5th floor should never be a monster floor
        for floor in (5..=120).step_by(5) {
            assert!(!is_monster_floor(12345, 5, floor, GameVersion::V1_5));
        }
    }

    #[test]
    fn test_monster_floor_early_floors() {
        // First few floors of each section should be safe
        for section_start in [0, 40, 80] {
            for offset in 1..5 {
                let floor = section_start + offset;
                assert!(!is_monster_floor(12345, 5, floor, GameVersion::V1_5));
            }
        }
    }

    #[test]
    fn test_dark_floor_every_10th() {
        // Every 10th floor should never be dark
        for floor in (10..=120).step_by(10) {
            assert!(!is_unusual_dark_floor(12345, 5, floor));
        }
    }

    #[test]
    fn test_mushroom_floor_requires_floor_80() {
        // Mushroom floors only possible on floors 81+
        for floor in 1..=80 {
            assert!(!is_mushroom_floor(12345, 5, floor, GameVersion::V1_5));
        }
    }

    #[test]
    fn test_remixed_chest_floor_10() {
        let result = remixed_mines_chest(12345, 10);
        assert!(result.is_some());
    }

    #[test]
    fn test_remixed_chest_invalid_floor() {
        assert!(remixed_mines_chest(12345, 15).is_none());
    }

    #[test]
    fn test_version_difference() {
        // 1.3 and 1.4+ should give different results due to different seeding
        let seed = 12345;
        let days = 10;

        // Find at least one floor where they differ
        let mut found_diff = false;
        for floor in 6..30 {
            let v13 = is_monster_floor(seed, days, floor, GameVersion::V1_3);
            let v15 = is_monster_floor(seed, days, floor, GameVersion::V1_5);
            if v13 != v15 {
                found_diff = true;
                break;
            }
        }
        assert!(
            found_diff,
            "Should find at least one floor where v1.3 and v1.5 differ"
        );
    }
}

//! Geode prediction for Stardew Valley.
//!
//! Predicts what items will drop from different types of geodes.

use crate::rng::CSRandomLite;
use crate::version::GameVersion;

/// Types of geodes in Stardew Valley.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum GeodeType {
    Geode,
    FrozenGeode,
    MagmaGeode,
    OmniGeode,
    ArtifactTrove,
    GoldenCoconut,
}

/// Items that can be found in regular Geodes.
const GEODE_ITEMS: [i32; 16] = [
    538, 542, 548, 549, 552, 555, 556, 557, 558, 566, 568, 569, 571, 574, 576, 121,
];

/// Items that can be found in Frozen Geodes.
const FROZEN_ITEMS: [i32; 15] = [
    541, 544, 545, 546, 550, 551, 559, 560, 561, 564, 567, 572, 573, 577, 123,
];

/// Items that can be found in Magma Geodes.
const MAGMA_ITEMS: [i32; 13] = [
    539, 540, 543, 547, 553, 554, 562, 563, 565, 570, 575, 578, 122,
];

/// Items that can be found in Omni Geodes.
const OMNI_ITEMS: [i32; 44] = [
    538, 542, 548, 549, 552, 555, 556, 557, 558, 566, 568, 569, 571, 574, 576, 541, 544, 545, 546,
    550, 551, 559, 560, 561, 564, 567, 572, 573, 577, 539, 540, 543, 547, 553, 554, 562, 563, 565,
    570, 575, 578, 121, 122, 123,
];

/// Items that can be found in Artifact Troves.
const TROVE_ITEMS: [i32; 27] = [
    100, 101, 103, 104, 105, 106, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120,
    121, 122, 123, 124, 125, 166, 373, 797,
];

/// Result of opening a geode.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct GeodeResult {
    pub item_id: i32,
    pub quantity: i32,
}

/// Predict what item will come from a geode.
pub fn next_geode_item(
    seed: i32,
    geodes_cracked: i32,
    geode_type: GeodeType,
    deepest_mine_level: i32,
    version: GameVersion,
) -> GeodeResult {
    let rng_seed = geodes_cracked + (seed / 2);
    let mut rng = CSRandomLite::new(rng_seed);

    // Version-specific warmup
    if version.has_geode_warmup() {
        let num1 = rng.next_range(1, 10);
        for _ in 0..num1 {
            rng.sample();
        }
        let num2 = rng.next_range(1, 10);
        for _ in 0..num2 {
            rng.sample();
        }
    }

    // Version 1.5+ has Qi beans check
    if version.has_qi_bean_check() {
        rng.sample();
    }

    // Golden Coconut special handling
    if geode_type == GeodeType::GoldenCoconut {
        return get_coconut_result(&mut rng, false);
    }

    // Artifact Trove goes straight to mineral list
    if geode_type == GeodeType::ArtifactTrove {
        let item = TROVE_ITEMS[rng.next_max(TROVE_ITEMS.len() as i32) as usize];
        return GeodeResult { item_id: item, quantity: 1 };
    }

    // 1.6 reversed the mineral/ore check
    let get_mineral = if version.has_reversed_geode_check() {
        rng.sample() < 0.5
    } else {
        rng.sample() >= 0.5
    };

    if !get_mineral {
        // Resource drops (ore, stone, clay, etc.)
        let initial_stack = get_initial_stack(&mut rng);

        // 50% chance of stone/clay/coal/crystal vs ore
        if rng.sample() < 0.5 {
            let case = rng.next_max(4);
            match case {
                0 | 1 => return GeodeResult { item_id: 390, quantity: initial_stack }, // Stone
                2 => return GeodeResult { item_id: 330, quantity: 1 },                  // Clay
                _ => {
                    // Crystal based on geode type
                    let crystal = match geode_type {
                        GeodeType::Geode => 86,         // Earth Crystal
                        GeodeType::FrozenGeode => 84,   // Frozen Tear
                        GeodeType::MagmaGeode => 82,    // Fire Quartz
                        GeodeType::OmniGeode => 82 + rng.next_max(3) * 2, // Random crystal
                        _ => 86,
                    };
                    return GeodeResult { item_id: crystal, quantity: 1 };
                }
            }
        } else {
            // Ore drops based on geode type and mine level
            return get_ore_result(&mut rng, geode_type, deepest_mine_level, initial_stack);
        }
    }

    // Mineral/artifact drop
    let geode_set = match geode_type {
        GeodeType::Geode => &GEODE_ITEMS[..],
        GeodeType::FrozenGeode => &FROZEN_ITEMS[..],
        GeodeType::MagmaGeode => &MAGMA_ITEMS[..],
        GeodeType::OmniGeode => &OMNI_ITEMS[..],
        GeodeType::ArtifactTrove => &TROVE_ITEMS[..],
        GeodeType::GoldenCoconut => return get_coconut_result(&mut rng, false),
    };

    // 1.6 checks prismatic shard differently
    if version.has_reversed_geode_check() {
        // 1.6: Check prismatic before selecting mineral
        let mineral_roll = rng.sample();
        if mineral_roll < 0.008 && geodes_cracked > 15 {
            return GeodeResult { item_id: 74, quantity: 1 }; // Prismatic Shard
        }
        let item = geode_set[rng.next_max(geode_set.len() as i32) as usize];
        GeodeResult { item_id: item, quantity: 1 }
    } else {
        // Pre-1.6: Select mineral then check prismatic
        let item = geode_set[rng.next_max(geode_set.len() as i32) as usize];

        // Omni geode has 0.8% chance for Prismatic Shard after 15 geodes
        if geode_type == GeodeType::OmniGeode && rng.sample() < 0.008 && geodes_cracked > 15 {
            return GeodeResult { item_id: 74, quantity: 1 }; // Prismatic Shard
        }

        GeodeResult { item_id: item, quantity: 1 }
    }
}

/// Calculate initial stack size for resource drops.
fn get_initial_stack(rng: &mut CSRandomLite) -> i32 {
    let mut initial_stack = rng.next_max(3) * 2 + 1;
    if rng.sample() < 0.1 {
        initial_stack = 10;
    }
    if rng.sample() < 0.01 {
        initial_stack = 20;
    }
    initial_stack
}

/// Get ore result based on geode type and mine level.
fn get_ore_result(
    rng: &mut CSRandomLite,
    geode_type: GeodeType,
    deepest_mine_level: i32,
    initial_stack: i32,
) -> GeodeResult {
    match geode_type {
        GeodeType::Geode => {
            let case = rng.next_max(3);
            match case {
                0 => GeodeResult { item_id: 378, quantity: initial_stack }, // Copper
                1 => {
                    if deepest_mine_level > 25 {
                        GeodeResult { item_id: 380, quantity: initial_stack } // Iron
                    } else {
                        GeodeResult { item_id: 378, quantity: initial_stack } // Copper
                    }
                }
                _ => GeodeResult { item_id: 382, quantity: initial_stack }, // Coal
            }
        }
        GeodeType::FrozenGeode => {
            let case = rng.next_max(4);
            match case {
                0 => GeodeResult { item_id: 378, quantity: initial_stack }, // Copper
                1 => GeodeResult { item_id: 380, quantity: initial_stack }, // Iron
                2 => GeodeResult { item_id: 382, quantity: initial_stack }, // Coal
                _ => {
                    if deepest_mine_level > 75 {
                        GeodeResult { item_id: 384, quantity: initial_stack } // Gold
                    } else {
                        GeodeResult { item_id: 380, quantity: initial_stack } // Iron
                    }
                }
            }
        }
        GeodeType::MagmaGeode | GeodeType::OmniGeode => {
            let case = rng.next_max(5);
            match case {
                0 => GeodeResult { item_id: 378, quantity: initial_stack }, // Copper
                1 => GeodeResult { item_id: 380, quantity: initial_stack }, // Iron
                2 => GeodeResult { item_id: 382, quantity: initial_stack }, // Coal
                3 => GeodeResult { item_id: 384, quantity: initial_stack }, // Gold
                _ => GeodeResult { item_id: 386, quantity: initial_stack / 2 + 1 }, // Iridium
            }
        }
        _ => GeodeResult { item_id: 390, quantity: initial_stack }, // Stone fallback
    }
}

/// Get result from Golden Coconut.
fn get_coconut_result(rng: &mut CSRandomLite, has_coconut_hat: bool) -> GeodeResult {
    // 5% chance for coconut hat if not already owned
    if rng.sample() < 0.05 && !has_coconut_hat {
        return GeodeResult { item_id: -1, quantity: 1 }; // Special: Hat
    }

    let case = rng.next_max(7);
    match case {
        0 => GeodeResult { item_id: 69, quantity: 1 },   // Banana Sapling
        1 => GeodeResult { item_id: 835, quantity: 1 },  // Mango Sapling
        2 => GeodeResult { item_id: 833, quantity: 5 },  // Pineapple Seeds
        3 => GeodeResult { item_id: 831, quantity: 5 },  // Taro Root
        4 => GeodeResult { item_id: 820, quantity: 1 },  // Fossilized Skull
        5 => GeodeResult { item_id: 292, quantity: 1 },  // Mahogany Seed
        _ => GeodeResult { item_id: 386, quantity: 5 },  // Iridium Ore
    }
}

/// Predict a sequence of geode results.
pub fn predict_geode_sequence(
    seed: i32,
    start_geode: i32,
    count: i32,
    geode_type: GeodeType,
    deepest_mine_level: i32,
    version: GameVersion,
) -> Vec<GeodeResult> {
    (0..count)
        .map(|i| {
            next_geode_item(
                seed,
                start_geode + i,
                geode_type,
                deepest_mine_level,
                version,
            )
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_geode_deterministic() {
        let result1 = next_geode_item(12345, 1, GeodeType::Geode, 50, GameVersion::V1_5);
        let result2 = next_geode_item(12345, 1, GeodeType::Geode, 50, GameVersion::V1_5);
        assert_eq!(result1, result2);
    }

    #[test]
    fn test_geode_sequence_unique_items() {
        let results = predict_geode_sequence(12345, 1, 100, GeodeType::OmniGeode, 120, GameVersion::V1_5);
        let unique: std::collections::HashSet<_> = results.iter().map(|r| r.item_id).collect();
        assert!(unique.len() > 5, "Should have variety in 100 geodes");
    }

    #[test]
    fn test_artifact_trove_items() {
        for i in 1..=50 {
            let result = next_geode_item(12345, i, GeodeType::ArtifactTrove, 0, GameVersion::V1_5);
            assert!(
                TROVE_ITEMS.contains(&result.item_id),
                "Trove gave invalid item {}",
                result.item_id
            );
        }
    }

    #[test]
    fn test_version_difference() {
        // 1.5 and 1.6 should give different results due to reversed geode check
        let mut found_diff = false;
        for geode_num in 1..100 {
            let v15 = next_geode_item(12345, geode_num, GeodeType::OmniGeode, 120, GameVersion::V1_5);
            let v16 = next_geode_item(12345, geode_num, GeodeType::OmniGeode, 120, GameVersion::V1_6);
            if v15 != v16 {
                found_diff = true;
                break;
            }
        }
        assert!(found_diff, "1.5 and 1.6 should give different geode results");
    }
}

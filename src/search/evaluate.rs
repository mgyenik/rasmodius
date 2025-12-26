//! Filter evaluation logic.
//!
//! All filter conditions are evaluated entirely in Rust for performance.

use super::filter::{FilterCondition, FilterNode};
use crate::mechanics;
use crate::version::GameVersion;

/// Evaluate a filter tree against a seed.
pub fn evaluate_filter(seed: i32, filter: &FilterNode, version: GameVersion) -> bool {
    match filter {
        FilterNode::And { conditions } => {
            conditions.iter().all(|c| evaluate_filter(seed, c, version))
        }
        FilterNode::Or { conditions } => {
            conditions.iter().any(|c| evaluate_filter(seed, c, version))
        }
        FilterNode::Condition(cond) => evaluate_condition(seed, cond, version),
    }
}

/// Evaluate a single condition against a seed.
fn evaluate_condition(seed: i32, cond: &FilterCondition, version: GameVersion) -> bool {
    match cond {
        FilterCondition::DailyLuck {
            day_start,
            day_end,
            min_luck,
            max_luck,
        } => {
            for day in *day_start..=*day_end {
                let luck = mechanics::daily_luck(seed, day, 0, false);
                if luck >= *min_luck && luck <= *max_luck {
                    return true;
                }
            }
            false
        }

        FilterCondition::CartItem {
            day_start,
            day_end,
            item_id,
            max_price,
        } => {
            for day in *day_start..=*day_end {
                // Only check cart days (Friday = 5, Sunday = 7)
                if !is_cart_day(day) {
                    continue;
                }
                if check_cart_has_item(seed, day, *item_id, *max_price, version) {
                    return true;
                }
            }
            false
        }

        FilterCondition::NightEvent {
            day_start,
            day_end,
            event_type,
        } => {
            let target_event = parse_night_event(event_type);
            for day in *day_start..=*day_end {
                if let Some(event) = mechanics::night_event(seed, day, version) {
                    if target_event == Some(event) || (event_type == "any") {
                        return true;
                    }
                }
            }
            false
        }

        FilterCondition::Geode {
            geode_number,
            geode_type,
            target_items,
        } => {
            let gt = parse_geode_type(geode_type);
            let result = mechanics::next_geode_item(seed, *geode_number, gt, 120, version);
            target_items.contains(&result.item_id)
        }

        FilterCondition::DishOfDay {
            day_start,
            day_end,
            dish_id,
        } => {
            for day in *day_start..=*day_end {
                let (dish, _qty) = mechanics::dish_of_the_day(seed, day, 0);
                if dish == *dish_id {
                    return true;
                }
            }
            false
        }

        FilterCondition::Weather {
            day_start,
            day_end,
            weather_type,
        } => {
            let target = parse_weather(weather_type);
            for day in *day_start..=*day_end {
                let weather = mechanics::weather_tomorrow(seed, day, 0, 0, false, version);
                if weather == target || (weather_type == "any" && weather != mechanics::Weather::Sunny) {
                    return true;
                }
            }
            false
        }

        FilterCondition::MineFloor {
            day_start,
            day_end,
            floor_start,
            floor_end,
            no_monsters,
            no_dark,
            has_mushroom,
        } => {
            for day in *day_start..=*day_end {
                if check_mine_floors(
                    seed,
                    day,
                    *floor_start,
                    *floor_end,
                    *no_monsters,
                    *no_dark,
                    *has_mushroom,
                    version,
                ) {
                    return true;
                }
            }
            false
        }
    }
}

/// Check if a day is a cart day (Friday or Sunday).
fn is_cart_day(day: i32) -> bool {
    let day_of_week = ((day - 1) % 7) + 1;
    day_of_week == 5 || day_of_week == 7
}

/// Check if cart has item with optional price constraint.
fn check_cart_has_item(
    seed: i32,
    day: i32,
    item_id: i32,
    max_price: Option<i32>,
    version: GameVersion,
) -> bool {
    let cart = mechanics::get_cart_for_day(seed, day, version);
    for item in cart {
        if item.item_id == item_id {
            if let Some(max) = max_price {
                if item.price <= max {
                    return true;
                }
            } else {
                return true;
            }
        }
    }
    false
}

/// Check mine floor conditions.
fn check_mine_floors(
    seed: i32,
    day: i32,
    floor_start: i32,
    floor_end: i32,
    no_monsters: bool,
    no_dark: bool,
    has_mushroom: bool,
    version: GameVersion,
) -> bool {
    // Check no-monster constraint
    if no_monsters {
        let monster_floors = mechanics::find_monster_floors(seed, day, floor_start, floor_end, version);
        if !monster_floors.is_empty() {
            return false;
        }
    }

    // Check no-dark constraint
    if no_dark {
        let dark_floors = mechanics::find_dark_floors(seed, day, floor_start, floor_end);
        if !dark_floors.is_empty() {
            return false;
        }
    }

    // Check has-mushroom constraint (only floors 81+)
    if has_mushroom {
        let mush_start = floor_start.max(81);
        if mush_start <= floor_end {
            let mushroom_floors = mechanics::find_mushroom_floors(seed, day, mush_start, floor_end, version);
            if mushroom_floors.is_empty() {
                return false;
            }
        } else {
            // Range doesn't include 81+, can't have mushroom floors
            return false;
        }
    }

    true
}

/// Parse night event type from string.
fn parse_night_event(s: &str) -> Option<mechanics::NightEvent> {
    match s.to_lowercase().as_str() {
        "fairy" => Some(mechanics::NightEvent::Fairy),
        "witch" => Some(mechanics::NightEvent::Witch),
        "meteor" => Some(mechanics::NightEvent::Meteor),
        "ufo" | "capsule" => Some(mechanics::NightEvent::Ufo),
        "owl" => Some(mechanics::NightEvent::Owl),
        "earthquake" => Some(mechanics::NightEvent::Earthquake),
        _ => None,
    }
}

/// Parse geode type from string.
fn parse_geode_type(s: &str) -> mechanics::GeodeType {
    match s.to_lowercase().as_str() {
        "geode" => mechanics::GeodeType::Geode,
        "frozen" | "frozen_geode" => mechanics::GeodeType::FrozenGeode,
        "magma" | "magma_geode" => mechanics::GeodeType::MagmaGeode,
        "omni" | "omni_geode" => mechanics::GeodeType::OmniGeode,
        "trove" | "artifact_trove" => mechanics::GeodeType::ArtifactTrove,
        "coconut" | "golden_coconut" => mechanics::GeodeType::GoldenCoconut,
        _ => mechanics::GeodeType::Geode,
    }
}

/// Parse weather type from string.
fn parse_weather(s: &str) -> mechanics::Weather {
    match s.to_lowercase().as_str() {
        "sunny" | "sun" => mechanics::Weather::Sunny,
        "rain" | "rainy" => mechanics::Weather::Rain,
        "debris" | "windy" | "wind" => mechanics::Weather::Debris,
        "lightning" | "storm" | "stormy" => mechanics::Weather::Lightning,
        "snow" | "snowy" => mechanics::Weather::Snow,
        _ => mechanics::Weather::Sunny,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_is_cart_day() {
        // Day 1 = Monday
        assert!(!is_cart_day(1)); // Monday
        assert!(!is_cart_day(2)); // Tuesday
        assert!(!is_cart_day(3)); // Wednesday
        assert!(!is_cart_day(4)); // Thursday
        assert!(is_cart_day(5));  // Friday
        assert!(!is_cart_day(6)); // Saturday
        assert!(is_cart_day(7));  // Sunday
        assert!(!is_cart_day(8)); // Monday
        assert!(is_cart_day(12)); // Friday
        assert!(is_cart_day(14)); // Sunday
    }

    #[test]
    fn test_filter_parsing() {
        let json = r#"{
            "logic": "and",
            "conditions": [
                {
                    "logic": "condition",
                    "type": "daily_luck",
                    "day_start": 1,
                    "day_end": 7,
                    "min_luck": 0.05,
                    "max_luck": 1.0
                }
            ]
        }"#;

        let filter: FilterNode = serde_json::from_str(json).unwrap();
        match filter {
            FilterNode::And { conditions } => {
                assert_eq!(conditions.len(), 1);
            }
            _ => panic!("Expected And node"),
        }
    }

    #[test]
    fn test_cart_item_filter_parsing() {
        let json = r#"{
            "logic": "condition",
            "type": "cart_item",
            "day_start": 1,
            "day_end": 28,
            "item_id": 266,
            "max_price": null
        }"#;

        let filter: FilterNode = serde_json::from_str(json).unwrap();
        match filter {
            FilterNode::Condition(cond) => match *cond {
                FilterCondition::CartItem { item_id, .. } => {
                    assert_eq!(item_id, 266);
                }
                _ => panic!("Expected CartItem condition"),
            },
            _ => panic!("Expected Condition node"),
        }
    }
}

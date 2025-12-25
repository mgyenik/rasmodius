pub mod mechanics;
mod rng;
mod version;

use wasm_bindgen::prelude::*;
pub use version::GameVersion;

// Initialize panic hook for better error messages in browser console
#[wasm_bindgen(start)]
pub fn init() {
    #[cfg(feature = "console_error_panic_hook")]
    console_error_panic_hook::set_once();
}

// Re-export RNG types for WASM
pub use rng::{CSRandom, CSRandomLite};

#[wasm_bindgen]
pub fn create_random(seed: i32) -> CSRandom {
    CSRandom::new(seed)
}

#[wasm_bindgen]
pub fn create_random_lite(seed: i32) -> CSRandomLite {
    CSRandomLite::new(seed)
}

/// Test function to verify RNG implementation matches Python
#[wasm_bindgen]
pub fn test_rng_sample(seed: i32, calls: u32) -> Vec<f64> {
    let mut rng = CSRandom::new(seed);
    (0..calls).map(|_| rng.sample()).collect()
}

/// Test function for CSRandomLite
#[wasm_bindgen]
pub fn test_rng_lite_sample(seed: i32, calls: u32) -> Vec<f64> {
    let mut rng = CSRandomLite::new(seed);
    (0..calls).map(|_| rng.sample()).collect()
}

// ============================================================================
// Game Mechanics WASM Exports
// ============================================================================

/// Calculate daily luck for a given seed and day.
/// Returns a value in range [-0.1, 0.1].
#[wasm_bindgen]
pub fn get_daily_luck(seed: i32, days_played: i32, steps: i32, has_friends: bool) -> f64 {
    mechanics::daily_luck(seed, days_played, steps, has_friends)
}

/// Get the dish of the day for a given seed and day.
/// Returns [dish_id, quantity].
#[wasm_bindgen]
pub fn get_dish_of_the_day(seed: i32, days_played: i32, steps: i32) -> Vec<i32> {
    let (dish, qty) = mechanics::dish_of_the_day(seed, days_played, steps);
    vec![dish, qty]
}

/// Get the night event for a given seed and day.
/// Returns: 0 = None, 1 = Fairy, 2 = Witch, 3 = Meteor, 4 = UFO, 5 = Owl, 6 = Earthquake
#[wasm_bindgen]
pub fn get_night_event(seed: i32, days_played: i32, version: &str) -> u8 {
    let v = GameVersion::from_str(version);
    match mechanics::night_event(seed, days_played, v) {
        None => 0,
        Some(mechanics::NightEvent::Fairy) => 1,
        Some(mechanics::NightEvent::Witch) => 2,
        Some(mechanics::NightEvent::Meteor) => 3,
        Some(mechanics::NightEvent::Ufo) => 4,
        Some(mechanics::NightEvent::Owl) => 5,
        Some(mechanics::NightEvent::Earthquake) => 6,
    }
}

/// Find all night events in a day range.
/// Returns array of [day, event_type] pairs.
#[wasm_bindgen]
pub fn find_night_events_in_range(seed: i32, start_day: i32, end_day: i32, version: &str) -> Vec<i32> {
    let v = GameVersion::from_str(version);
    mechanics::find_night_events(seed, start_day, end_day, v)
        .into_iter()
        .flat_map(|(day, event)| {
            let event_code = match event {
                mechanics::NightEvent::Fairy => 1,
                mechanics::NightEvent::Witch => 2,
                mechanics::NightEvent::Meteor => 3,
                mechanics::NightEvent::Ufo => 4,
                mechanics::NightEvent::Owl => 5,
                mechanics::NightEvent::Earthquake => 6,
            };
            [day, event_code]
        })
        .collect()
}

/// Get traveling cart stock for a specific day.
/// Returns array of [item_id, price, quantity] triples.
#[wasm_bindgen]
pub fn get_traveling_cart(game_id: i32, day_number: i32, version: &str) -> Vec<i32> {
    let v = GameVersion::from_str(version);
    mechanics::get_cart_for_day(game_id, day_number, v)
        .into_iter()
        .flat_map(|item| [item.item_id, item.price, item.quantity])
        .collect()
}

/// Check if cart has a specific item on a given day.
#[wasm_bindgen]
pub fn cart_has_item(game_id: i32, day_number: i32, target_item: i32, version: &str) -> bool {
    let v = GameVersion::from_str(version);
    mechanics::cart_has_item(game_id, day_number, target_item, v)
}

/// Find first cart day with a target item.
/// Returns [day, price, quantity] or empty array if not found.
#[wasm_bindgen]
pub fn find_item_in_cart(game_id: i32, target_item: i32, max_days: i32, version: &str) -> Vec<i32> {
    let v = GameVersion::from_str(version);
    match mechanics::find_item_in_cart(game_id, target_item, max_days, v) {
        Some((day, price, qty)) => vec![day, price, qty],
        None => vec![],
    }
}

/// Predict geode contents.
/// geode_type: 0=Geode, 1=Frozen, 2=Magma, 3=Omni, 4=Trove, 5=Coconut
/// Returns [item_id, quantity].
#[wasm_bindgen]
pub fn get_geode_item(
    seed: i32,
    geodes_cracked: i32,
    geode_type: u8,
    deepest_mine_level: i32,
    version: &str,
) -> Vec<i32> {
    let v = GameVersion::from_str(version);
    let gt = match geode_type {
        0 => mechanics::GeodeType::Geode,
        1 => mechanics::GeodeType::FrozenGeode,
        2 => mechanics::GeodeType::MagmaGeode,
        3 => mechanics::GeodeType::OmniGeode,
        4 => mechanics::GeodeType::ArtifactTrove,
        5 => mechanics::GeodeType::GoldenCoconut,
        _ => mechanics::GeodeType::Geode,
    };

    let result = mechanics::next_geode_item(seed, geodes_cracked, gt, deepest_mine_level, v);
    vec![result.item_id, result.quantity]
}

/// Predict a sequence of geode results.
/// Returns flat array of [item_id, quantity] pairs.
#[wasm_bindgen]
pub fn predict_geode_sequence(
    seed: i32,
    start_geode: i32,
    count: i32,
    geode_type: u8,
    deepest_mine_level: i32,
    version: &str,
) -> Vec<i32> {
    let v = GameVersion::from_str(version);
    let gt = match geode_type {
        0 => mechanics::GeodeType::Geode,
        1 => mechanics::GeodeType::FrozenGeode,
        2 => mechanics::GeodeType::MagmaGeode,
        3 => mechanics::GeodeType::OmniGeode,
        4 => mechanics::GeodeType::ArtifactTrove,
        5 => mechanics::GeodeType::GoldenCoconut,
        _ => mechanics::GeodeType::Geode,
    };

    mechanics::predict_geode_sequence(seed, start_geode, count, gt, deepest_mine_level, v)
        .into_iter()
        .flat_map(|r| [r.item_id, r.quantity])
        .collect()
}

// ============================================================================
// Weather WASM Exports
// ============================================================================

/// Predict tomorrow's weather.
/// Returns: 0=Sunny, 1=Rain, 2=Windy, 3=Storm, 5=Snow
#[wasm_bindgen]
pub fn get_weather_tomorrow(
    seed: i32,
    days_played: i32,
    steps: i32,
    weather_today: u8,
    has_friends: bool,
    version: &str,
) -> u8 {
    let v = GameVersion::from_str(version);
    mechanics::weather_tomorrow(seed, days_played, steps, weather_today, has_friends, v).to_code()
}

/// Find days with specific weather in a range.
/// Returns array of day numbers.
#[wasm_bindgen]
pub fn find_weather_days(
    seed: i32,
    start_day: i32,
    end_day: i32,
    target_weather: u8,
    version: &str,
) -> Vec<i32> {
    let v = GameVersion::from_str(version);
    let weather = mechanics::Weather::from_code(target_weather);
    mechanics::find_weather_days(seed, start_day, end_day, weather, v)
}

// ============================================================================
// Mine Floor WASM Exports
// ============================================================================

/// Check if a floor is a monster/infested floor.
#[wasm_bindgen]
pub fn is_monster_floor(seed: i32, days_played: i32, level: i32, version: &str) -> bool {
    let v = GameVersion::from_str(version);
    mechanics::is_monster_floor(seed, days_played, level, v)
}

/// Check if a floor has unusual darkness.
#[wasm_bindgen]
pub fn is_dark_floor(seed: i32, days_played: i32, level: i32) -> bool {
    mechanics::is_unusual_dark_floor(seed, days_played, level)
}

/// Check if a floor is a mushroom floor.
#[wasm_bindgen]
pub fn is_mushroom_floor(seed: i32, days_played: i32, floor: i32, version: &str) -> bool {
    let v = GameVersion::from_str(version);
    mechanics::is_mushroom_floor(seed, days_played, floor, v)
}

/// Get all floor conditions as a bitmask.
/// Returns: bit 0 = monster, bit 1 = dark, bit 2 = mushroom
#[wasm_bindgen]
pub fn get_floor_conditions(seed: i32, days_played: i32, level: i32, version: &str) -> u8 {
    let v = GameVersion::from_str(version);
    let conditions = mechanics::get_floor_conditions(seed, days_played, level, v);
    let mut result = 0u8;
    if conditions.is_monster_floor {
        result |= 1;
    }
    if conditions.is_dark_floor {
        result |= 2;
    }
    if conditions.is_mushroom_floor {
        result |= 4;
    }
    result
}

/// Find all monster floors in a range.
/// Returns array of floor numbers.
#[wasm_bindgen]
pub fn find_monster_floors(seed: i32, days_played: i32, start_floor: i32, end_floor: i32, version: &str) -> Vec<i32> {
    let v = GameVersion::from_str(version);
    mechanics::find_monster_floors(seed, days_played, start_floor, end_floor, v)
}

/// Find all dark floors in a range.
/// Returns array of floor numbers.
#[wasm_bindgen]
pub fn find_dark_floors(seed: i32, days_played: i32, start_floor: i32, end_floor: i32) -> Vec<i32> {
    mechanics::find_dark_floors(seed, days_played, start_floor, end_floor)
}

/// Find all mushroom floors in a range.
/// Returns array of floor numbers.
#[wasm_bindgen]
pub fn find_mushroom_floors(seed: i32, days_played: i32, start_floor: i32, end_floor: i32, version: &str) -> Vec<i32> {
    let v = GameVersion::from_str(version);
    mechanics::find_mushroom_floors(seed, days_played, start_floor, end_floor, v)
}

/// Get remixed mines chest contents.
/// Returns [item_type, item_id] where item_type: 0=Boots, 1=MeleeWeapon, 2=Ring
/// Returns empty array if floor doesn't have a remixed chest.
#[wasm_bindgen]
pub fn get_remixed_chest(seed: i32, floor: i32) -> Vec<i32> {
    match mechanics::remixed_mines_chest(seed, floor) {
        Some(item) => {
            let type_code = match item.item_type {
                mechanics::ChestItemType::Boots => 0,
                mechanics::ChestItemType::MeleeWeapon => 1,
                mechanics::ChestItemType::Ring => 2,
            };
            vec![type_code, item.item_id]
        }
        None => vec![],
    }
}

/// Check what items spawn at a mine rock spot.
/// Returns array of item IDs that would drop.
#[wasm_bindgen]
pub fn check_mines_spot(
    seed: i32,
    floor: i32,
    x: i32,
    y: i32,
    ladder: bool,
    geologist: bool,
    excavator: bool,
) -> Vec<i32> {
    mechanics::check_mines_spot_at(seed, floor, x, y, ladder, geologist, excavator)
}

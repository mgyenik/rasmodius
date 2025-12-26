//! Rasmodius - Stardew Valley seed prediction library
//!
//! This library provides two main APIs:
//!
//! 1. **Explore API** - Predict game mechanics for a single seed/day
//!    - `predict_day()` - All daily mechanics (luck, dish, weather, night event, cart)
//!    - `predict_geodes()` - Geode sequence prediction
//!    - `find_monster_floors()`, `find_dark_floors()`, `find_mushroom_floors()` - Mine floor queries
//!    - `find_item_in_cart()` - Search for item across cart days
//!
//! 2. **Search API** - Find seeds matching filter criteria
//!    - `search_range()` - Evaluate filters across seed range with callbacks
//!
//! Internal mechanics are in the `mechanics` module and can be unit tested directly.

pub mod mechanics;
mod rng;
pub mod search;
pub mod types;
mod version;

use wasm_bindgen::prelude::*;
pub use search::search_range;
pub use types::*;
pub use version::GameVersion;

// Re-export RNG for internal use and testing
pub use rng::{CSRandom, CSRandomLite};

/// Initialize panic hook for better error messages in browser console.
#[wasm_bindgen(start)]
pub fn init() {
    #[cfg(feature = "console_error_panic_hook")]
    console_error_panic_hook::set_once();
}

// ============================================================================
// Explore API - Day Prediction
// ============================================================================

/// Predict all day-based mechanics for a single seed and day.
///
/// Returns a DayPrediction with:
/// - luck: Daily luck value (-0.1 to 0.1)
/// - dish: Saloon dish of the day
/// - weather: Tomorrow's weather
/// - night_event: Night event (if any)
/// - cart: Traveling cart stock (only on Fri/Sun)
#[wasm_bindgen]
pub fn predict_day(seed: i32, day: i32, version: &str) -> JsValue {
    let v = GameVersion::from_str(version);

    let (dish_id, dish_qty) = mechanics::dish_of_the_day(seed, day, 0);
    let luck = mechanics::daily_luck(seed, day, 0, false);
    let weather_code = mechanics::weather_tomorrow(seed, day, 0, 0, false, v).to_code();

    let night_event = match mechanics::night_event(seed, day, v) {
        None => NightEventType::None,
        Some(mechanics::NightEvent::Fairy) => NightEventType::Fairy,
        Some(mechanics::NightEvent::Witch) => NightEventType::Witch,
        Some(mechanics::NightEvent::Meteor) => NightEventType::Meteor,
        Some(mechanics::NightEvent::Ufo) => NightEventType::Ufo,
        Some(mechanics::NightEvent::Owl) => NightEventType::Owl,
        Some(mechanics::NightEvent::Earthquake) => NightEventType::Earthquake,
    };

    let cart = if is_cart_day(day) {
        Some(
            mechanics::get_cart_for_day(seed, day, v)
                .into_iter()
                .map(|item| CartItem {
                    id: item.item_id,
                    price: item.price,
                    quantity: item.quantity,
                })
                .collect(),
        )
    } else {
        None
    };

    let prediction = DayPrediction {
        luck,
        dish: DishOfDay {
            id: dish_id,
            quantity: dish_qty,
        },
        weather: WeatherType::from_code(weather_code),
        night_event,
        cart,
    };

    serde_wasm_bindgen::to_value(&prediction).unwrap()
}

// ============================================================================
// Explore API - Geodes
// ============================================================================

/// Predict a sequence of geode results.
///
/// geode_type: "geode", "frozen", "magma", "omni", "trove", or "coconut"
/// Returns array of GeodeResult objects.
#[wasm_bindgen]
pub fn predict_geodes(
    seed: i32,
    start: i32,
    count: i32,
    geode_type: &str,
    version: &str,
) -> JsValue {
    let v = GameVersion::from_str(version);
    let gt = types::GeodeType::from_str(geode_type);

    let internal_gt = match gt {
        types::GeodeType::Geode => mechanics::GeodeType::Geode,
        types::GeodeType::FrozenGeode => mechanics::GeodeType::FrozenGeode,
        types::GeodeType::MagmaGeode => mechanics::GeodeType::MagmaGeode,
        types::GeodeType::OmniGeode => mechanics::GeodeType::OmniGeode,
        types::GeodeType::ArtifactTrove => mechanics::GeodeType::ArtifactTrove,
        types::GeodeType::GoldenCoconut => mechanics::GeodeType::GoldenCoconut,
    };

    let results: Vec<GeodeResult> =
        mechanics::predict_geode_sequence(seed, start, count, internal_gt, 120, v)
            .into_iter()
            .map(|r| GeodeResult {
                item_id: r.item_id,
                quantity: r.quantity,
            })
            .collect();

    serde_wasm_bindgen::to_value(&results).unwrap()
}

// ============================================================================
// Explore API - Mine Floors
// ============================================================================

/// Find all monster/infested floors in a range.
#[wasm_bindgen]
pub fn find_monster_floors(
    seed: i32,
    days_played: i32,
    start_floor: i32,
    end_floor: i32,
    version: &str,
) -> Vec<i32> {
    let v = GameVersion::from_str(version);
    mechanics::find_monster_floors(seed, days_played, start_floor, end_floor, v)
}

/// Find all unusually dark floors in a range.
#[wasm_bindgen]
pub fn find_dark_floors(
    seed: i32,
    days_played: i32,
    start_floor: i32,
    end_floor: i32,
) -> Vec<i32> {
    mechanics::find_dark_floors(seed, days_played, start_floor, end_floor)
}

/// Find all mushroom floors in a range (only valid for floors 81+).
#[wasm_bindgen]
pub fn find_mushroom_floors(
    seed: i32,
    days_played: i32,
    start_floor: i32,
    end_floor: i32,
    version: &str,
) -> Vec<i32> {
    let v = GameVersion::from_str(version);
    mechanics::find_mushroom_floors(seed, days_played, start_floor, end_floor, v)
}

// ============================================================================
// Explore API - Cart Search
// ============================================================================

/// Find first cart day with a target item within max_days.
///
/// Returns [day, price, quantity] or empty array if not found.
#[wasm_bindgen]
pub fn find_item_in_cart(
    seed: i32,
    target_item: i32,
    max_days: i32,
    version: &str,
) -> Vec<i32> {
    let v = GameVersion::from_str(version);
    match mechanics::find_item_in_cart(seed, target_item, max_days, v) {
        Some((day, price, qty)) => vec![day, price, qty],
        None => vec![],
    }
}


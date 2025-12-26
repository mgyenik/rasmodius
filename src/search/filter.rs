//! Filter types for the search kernel.
//!
//! These types are deserialized from JSON passed from JavaScript.

use serde::Deserialize;

/// Root of the filter tree - can be AND, OR, or a single condition.
#[derive(Debug, Clone, Deserialize)]
#[serde(tag = "logic")]
pub enum FilterNode {
    #[serde(rename = "and")]
    And { conditions: Vec<FilterNode> },

    #[serde(rename = "or")]
    Or { conditions: Vec<FilterNode> },

    #[serde(rename = "condition")]
    Condition(Box<FilterCondition>),
}

/// A single filter condition.
#[derive(Debug, Clone, Deserialize)]
#[serde(tag = "type")]
pub enum FilterCondition {
    #[serde(rename = "daily_luck")]
    DailyLuck {
        day_start: i32,
        day_end: i32,
        min_luck: f64,
        max_luck: f64,
    },

    #[serde(rename = "cart_item")]
    CartItem {
        day_start: i32,
        day_end: i32,
        item_id: i32,
        max_price: Option<i32>,
    },

    #[serde(rename = "night_event")]
    NightEvent {
        day_start: i32,
        day_end: i32,
        event_type: String,
    },

    #[serde(rename = "geode")]
    Geode {
        geode_number: i32,
        geode_type: String,
        target_items: Vec<i32>,
    },

    #[serde(rename = "dish_of_day")]
    DishOfDay {
        day_start: i32,
        day_end: i32,
        dish_id: i32,
    },

    #[serde(rename = "weather")]
    Weather {
        day_start: i32,
        day_end: i32,
        weather_type: String,
    },

    #[serde(rename = "mine_floor")]
    MineFloor {
        day_start: i32,
        day_end: i32,
        floor_start: i32,
        floor_end: i32,
        no_monsters: bool,
        no_dark: bool,
        has_mushroom: bool,
    },
}

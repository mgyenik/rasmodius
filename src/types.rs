//! Shared types for the Rasmodius WASM API.
//!
//! All types that cross the WASM boundary are defined here with serde Serialize.
//! This provides a clean contract between Rust and JavaScript.

use serde::Serialize;

/// Main prediction for a single day.
/// Returned by `predict_day()` - the unified Explore API entry point.
#[derive(Debug, Clone, Serialize)]
pub struct DayPrediction {
    pub luck: f64,
    pub dish: DishOfDay,
    pub weather: WeatherType,
    pub night_event: NightEventType,
    /// Cart items, only present on Fridays and Sundays
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cart: Option<Vec<CartItem>>,
}

/// Dish of the day at the Saloon.
#[derive(Debug, Clone, Serialize)]
pub struct DishOfDay {
    pub id: i32,
    pub quantity: i32,
}

/// Weather type (serializes as string for JS clarity).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum WeatherType {
    Sunny,
    Rain,
    Debris,
    Lightning,
    Snow,
    GreenRain,
}

impl WeatherType {
    pub fn from_code(code: u8) -> Self {
        match code {
            0 => Self::Sunny,
            1 => Self::Rain,
            2 => Self::Debris,
            3 => Self::Lightning,
            5 => Self::Snow,
            6 => Self::GreenRain,
            _ => Self::Sunny,
        }
    }

    pub fn to_code(self) -> u8 {
        match self {
            Self::Sunny => 0,
            Self::Rain => 1,
            Self::Debris => 2,
            Self::Lightning => 3,
            Self::Snow => 5,
            Self::GreenRain => 6,
        }
    }
}

/// Night event type (serializes as string).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum NightEventType {
    None,
    Fairy,
    Witch,
    Meteor,
    Ufo,
    Owl,
    Earthquake,
}

impl NightEventType {
    pub fn from_code(code: u8) -> Self {
        match code {
            0 => Self::None,
            1 => Self::Fairy,
            2 => Self::Witch,
            3 => Self::Meteor,
            4 => Self::Ufo,
            5 => Self::Owl,
            6 => Self::Earthquake,
            _ => Self::None,
        }
    }

    pub fn to_code(self) -> u8 {
        match self {
            Self::None => 0,
            Self::Fairy => 1,
            Self::Witch => 2,
            Self::Meteor => 3,
            Self::Ufo => 4,
            Self::Owl => 5,
            Self::Earthquake => 6,
        }
    }
}

/// An item in the traveling cart.
#[derive(Debug, Clone, Serialize)]
pub struct CartItem {
    pub id: i32,
    pub price: i32,
    pub quantity: i32,
}

/// Result of opening a geode.
#[derive(Debug, Clone, Serialize)]
pub struct GeodeResult {
    pub item_id: i32,
    pub quantity: i32,
}

/// Geode type (serializes as string).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum GeodeType {
    Geode,
    FrozenGeode,
    MagmaGeode,
    OmniGeode,
    ArtifactTrove,
    GoldenCoconut,
}

impl GeodeType {
    pub fn from_str(s: &str) -> Self {
        match s {
            "geode" => Self::Geode,
            "frozen" | "frozen_geode" => Self::FrozenGeode,
            "magma" | "magma_geode" => Self::MagmaGeode,
            "omni" | "omni_geode" => Self::OmniGeode,
            "trove" | "artifact_trove" => Self::ArtifactTrove,
            "coconut" | "golden_coconut" => Self::GoldenCoconut,
            _ => Self::Geode,
        }
    }
}

/// Floor prediction for mine exploration.
#[derive(Debug, Clone, Serialize)]
pub struct FloorPrediction {
    pub floor: i32,
    pub is_monster_floor: bool,
    pub is_dark_floor: bool,
    pub is_mushroom_floor: bool,
    /// Chest contents, if this floor has a remixed chest
    #[serde(skip_serializing_if = "Option::is_none")]
    pub chest: Option<ChestItem>,
}

/// Item type for remixed mine chests.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum ChestItemType {
    Boots,
    MeleeWeapon,
    Ring,
}

/// Item from a remixed mine chest.
#[derive(Debug, Clone, Serialize)]
pub struct ChestItem {
    pub item_type: ChestItemType,
    pub item_id: i32,
}

/// Helper to check if a day is a cart day (Friday or Sunday).
pub fn is_cart_day(day: i32) -> bool {
    let day_of_week = ((day - 1) % 7) + 1;
    day_of_week == 5 || day_of_week == 7 // Friday or Sunday
}

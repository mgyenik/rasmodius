//! Search kernel for Rasmodius.
//!
//! This module provides the `search_range` function that evaluates filters
//! entirely in Rust/WASM for maximum performance.

mod filter;
mod evaluate;

pub use filter::*;
pub use evaluate::*;

use crate::version::GameVersion;
use js_sys::Function;
use wasm_bindgen::prelude::*;

/// Search a range of seeds with a filter, calling callback for each match.
///
/// Progress is NOT reported from WASM - the JS worker handles progress between chunks.
/// This avoids expensive WASM↔JS boundary crossings in the hot loop.
///
/// # Arguments
/// * `filter_json` - JSON string representing the filter tree
/// * `start_seed` - First seed to check (inclusive)
/// * `end_seed` - Last seed to check (inclusive)
/// * `max_results` - Stop after finding this many matches
/// * `version` - Game version string ("1.6", "1.5", etc.)
/// * `on_match` - Called for each matching seed with (seed). Return false to stop.
///
/// # Returns
/// Ok(()) on success, Err with message on parse error
#[wasm_bindgen]
pub fn search_range(
    filter_json: &str,
    start_seed: i32,
    end_seed: i32,
    max_results: u32,
    version: &str,
    on_match: &Function,
) -> Result<(), JsValue> {
    // Parse filter once at the start
    let filter: FilterNode = serde_json::from_str(filter_json)
        .map_err(|e| JsValue::from_str(&format!("Filter parse error: {}", e)))?;

    let game_version = GameVersion::from_str(version);

    let mut matches = 0u32;

    for seed in start_seed..=end_seed {
        // Stop if we've found enough matches
        if matches >= max_results {
            break;
        }

        // Evaluate filter
        if evaluate_filter(seed, &filter, game_version) {
            matches += 1;
            // on_match returns false to signal cancellation (e.g., global maxResults hit)
            let result = on_match.call1(&JsValue::NULL, &JsValue::from(seed))?;
            if !result.as_bool().unwrap_or(true) {
                break;
            }
        }
    }

    Ok(())
}

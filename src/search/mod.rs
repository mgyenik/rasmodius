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

/// Search a range of seeds with a filter, calling callbacks for progress and matches.
///
/// # Arguments
/// * `filter_json` - JSON string representing the filter tree
/// * `start_seed` - First seed to check (inclusive)
/// * `end_seed` - Last seed to check (inclusive)
/// * `max_results` - Stop after finding this many matches
/// * `version` - Game version string ("1.6", "1.5", etc.)
/// * `on_progress` - Called every ~100ms with (checked, found). Return false to stop.
/// * `on_match` - Called for each matching seed with (seed)
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
    on_progress: &Function,
    on_match: &Function,
) -> Result<(), JsValue> {
    // Parse filter once at the start
    let filter: FilterNode = serde_json::from_str(filter_json)
        .map_err(|e| JsValue::from_str(&format!("Filter parse error: {}", e)))?;

    let game_version = GameVersion::from_str(version);

    let mut matches = 0u32;
    let mut checked = 0u32;
    let mut last_progress = instant::Instant::now();
    let progress_interval = std::time::Duration::from_millis(100);

    // Send initial progress
    let initial_result = on_progress.call2(
        &JsValue::NULL,
        &JsValue::from(0u32),
        &JsValue::from(0u32),
    )?;

    // Check if we should continue (callback can return false to stop)
    if !initial_result.as_bool().unwrap_or(true) {
        return Ok(());
    }

    for seed in start_seed..=end_seed {
        // Stop if we've found enough matches
        if matches >= max_results {
            break;
        }

        // Evaluate filter
        if evaluate_filter(seed, &filter, game_version) {
            matches += 1;
            on_match.call1(&JsValue::NULL, &JsValue::from(seed))?;
        }

        checked += 1;

        // Send progress every 100ms
        let now = instant::Instant::now();
        if now.duration_since(last_progress) >= progress_interval {
            let result = on_progress.call2(
                &JsValue::NULL,
                &JsValue::from(checked),
                &JsValue::from(matches),
            )?;

            // Check if we should continue
            if !result.as_bool().unwrap_or(true) {
                break;
            }

            last_progress = now;
        }
    }

    // Send final progress
    on_progress.call2(
        &JsValue::NULL,
        &JsValue::from(checked),
        &JsValue::from(matches),
    )?;

    Ok(())
}

//! Comprehensive golden tests against stardew-predictor reference data.
//!
//! This test suite validates our RNG implementations against 1.48M test cases
//! extracted from stardew-predictor. Any single failure indicates a bug that
//! must be fixed - there is zero tolerance for prediction errors.
//!
//! Test coverage:
//! - 100 seeds (deterministically selected)
//! - 1120 days (10 years) per seed
//! - 4 versions (1.3, 1.4, 1.5, 1.6)
//! - All mechanics: night events, cart items, daily luck, dish of day

use flate2::read::GzDecoder;
use rasmodius::mechanics::night_events::{night_event, NightEvent};
use rasmodius::mechanics::traveling_cart::get_cart_for_day;
use rasmodius::GameVersion;
use serde::Deserialize;
use std::collections::HashMap;
use std::fs::File;
use std::io::Read;
use std::sync::LazyLock;

/// ID to name mapping loaded from stardew-predictor data
/// This includes ALL objects, even duplicates with the same name but different IDs
static ID_TO_NAME: LazyLock<HashMap<i32, String>> = LazyLock::new(|| {
    let file = File::open("tests/id_to_name.json").expect("Failed to open id_to_name.json");
    let map: HashMap<String, String> =
        serde_json::from_reader(file).expect("Failed to parse id_to_name.json");
    map.into_iter()
        .filter_map(|(k, v)| k.parse::<i32>().ok().map(|id| (id, v)))
        .collect()
});

// ============================================================================
// JSON Schema (matches generate-comprehensive-golden.js output)
// ============================================================================

#[derive(Debug, Deserialize)]
struct GoldenData {
    metadata: Metadata,
    seeds: Vec<SeedData>,
}

#[derive(Debug, Deserialize)]
#[allow(dead_code)]
struct Metadata {
    generated_at: String,
    reference_commit: String,
    master_seed: u32,
    num_seeds: usize,
    num_days: usize,
    versions: Vec<String>,
}

#[derive(Debug, Deserialize)]
struct SeedData {
    seed: i32,
    versions: VersionsData,
}

#[derive(Debug, Deserialize)]
struct VersionsData {
    #[serde(rename = "1.3")]
    v1_3: VersionMechanics,
    #[serde(rename = "1.4")]
    v1_4: VersionMechanics,
    #[serde(rename = "1.5")]
    v1_5: VersionMechanics,
    #[serde(rename = "1.6")]
    v1_6: VersionMechanics,
}

#[derive(Debug, Deserialize)]
struct VersionMechanics {
    night_events: Vec<NightEventTest>,
    cart: Vec<CartTest>,
    daily_luck: Vec<DailyLuckTest>,
    dish_of_day: Vec<DishTest>,
}

#[derive(Debug, Deserialize)]
struct NightEventTest {
    day: i32,
    event: String,
}

#[derive(Debug, Deserialize)]
struct CartTest {
    day: i32,
    items: Vec<CartItemTest>,
}

#[derive(Debug, Deserialize)]
struct CartItemTest {
    name: String,
    price: i32,
    qty: i32,
}

#[derive(Debug, Deserialize)]
struct DailyLuckTest {
    day: i32,
    luck: f64,
}

#[derive(Debug, Deserialize)]
struct DishTest {
    day: i32,
    dish: i32,
}

// ============================================================================
// Test Helpers
// ============================================================================

fn load_golden_data() -> GoldenData {
    let file = File::open("tests/comprehensive_golden.json.gz")
        .expect("Failed to open comprehensive_golden.json.gz");
    let mut decoder = GzDecoder::new(file);
    let mut json_str = String::new();
    decoder
        .read_to_string(&mut json_str)
        .expect("Failed to decompress golden data");
    serde_json::from_str(&json_str).expect("Failed to parse golden data JSON")
}

fn parse_night_event(s: &str) -> Option<NightEvent> {
    match s {
        "none" => None,
        "fairy" => Some(NightEvent::Fairy),
        "witch" => Some(NightEvent::Witch),
        "meteor" => Some(NightEvent::Meteor),
        "owl" => Some(NightEvent::Owl),
        "capsule" => Some(NightEvent::Ufo),
        "earthquake" => Some(NightEvent::Earthquake),
        _ => panic!("Unknown night event: {}", s),
    }
}

fn night_event_to_str(event: Option<NightEvent>) -> &'static str {
    match event {
        None => "none",
        Some(NightEvent::Fairy) => "fairy",
        Some(NightEvent::Witch) => "witch",
        Some(NightEvent::Meteor) => "meteor",
        Some(NightEvent::Owl) => "owl",
        Some(NightEvent::Ufo) => "capsule",
        Some(NightEvent::Earthquake) => "earthquake",
    }
}

fn get_version_data(versions: &VersionsData, version: GameVersion) -> &VersionMechanics {
    match version {
        GameVersion::V1_3 => &versions.v1_3,
        GameVersion::V1_4 => &versions.v1_4,
        GameVersion::V1_5 => &versions.v1_5,
        GameVersion::V1_6 => &versions.v1_6,
    }
}

// ============================================================================
// Tests
// ============================================================================

#[test]
fn test_night_events_comprehensive() {
    let data = load_golden_data();
    let mut failures: Vec<String> = Vec::new();
    let mut total_tests = 0;

    for seed_data in &data.seeds {
        let seed = seed_data.seed;

        for version in [
            GameVersion::V1_3,
            GameVersion::V1_4,
            GameVersion::V1_5,
            GameVersion::V1_6,
        ] {
            let version_data = get_version_data(&seed_data.versions, version);

            for test in &version_data.night_events {
                total_tests += 1;
                let expected = parse_night_event(&test.event);
                let actual = night_event(seed, test.day, version);

                if actual != expected {
                    failures.push(format!(
                        "night_event: seed={} day={} version={:?}: expected={}, got={}",
                        seed,
                        test.day,
                        version,
                        test.event,
                        night_event_to_str(actual)
                    ));
                }
            }
        }
    }

    if !failures.is_empty() {
        let sample: String = failures.iter().take(20).cloned().collect::<Vec<_>>().join("\n");
        panic!(
            "\n{} night event failures out of {} tests:\n{}{}",
            failures.len(),
            total_tests,
            sample,
            if failures.len() > 20 {
                format!("\n... and {} more", failures.len() - 20)
            } else {
                String::new()
            }
        );
    }

    println!(
        "Night events: {}/{} tests passed",
        total_tests - failures.len(),
        total_tests
    );
}

#[test]
fn test_cart_items_comprehensive() {
    let data = load_golden_data();
    let mut failures: Vec<String> = Vec::new();
    let mut total_tests = 0;

    for seed_data in &data.seeds {
        let seed = seed_data.seed;

        for version in [
            GameVersion::V1_3,
            GameVersion::V1_4,
            GameVersion::V1_5,
            GameVersion::V1_6,
        ] {
            let version_data = get_version_data(&seed_data.versions, version);

            for test in &version_data.cart {
                total_tests += 1;
                let cart = get_cart_for_day(seed, test.day, version);

                // Compare each item: name, price, and quantity
                if cart.len() != test.items.len() {
                    failures.push(format!(
                        "cart: seed={} day={} version={:?}: length mismatch expected={} got={}",
                        seed, test.day, version, test.items.len(), cart.len()
                    ));
                    continue;
                }

                for (i, (actual, expected)) in cart.iter().zip(test.items.iter()).enumerate() {
                    let actual_name = ID_TO_NAME
                        .get(&actual.item_id)
                        .map(|s| s.as_str())
                        .unwrap_or("UNKNOWN");

                    // Compare name
                    if actual_name != expected.name {
                        failures.push(format!(
                            "cart[{}] name: seed={} day={} v={:?}: expected=\"{}\" got=\"{}\" (id={})",
                            i, seed, test.day, version, expected.name, actual_name, actual.item_id
                        ));
                    }

                    // Compare price
                    if actual.price != expected.price {
                        failures.push(format!(
                            "cart[{}] price: seed={} day={} v={:?} item={}: expected={} got={}",
                            i, seed, test.day, version, expected.name, expected.price, actual.price
                        ));
                    }

                    // Compare quantity
                    if actual.quantity != expected.qty {
                        failures.push(format!(
                            "cart[{}] qty: seed={} day={} v={:?} item={}: expected={} got={}",
                            i, seed, test.day, version, expected.name, expected.qty, actual.quantity
                        ));
                    }
                }
            }
        }
    }

    if !failures.is_empty() {
        let sample: String = failures.iter().take(20).cloned().collect::<Vec<_>>().join("\n");
        panic!(
            "\n{} cart failures out of {} tests:\n{}{}",
            failures.len(),
            total_tests,
            sample,
            if failures.len() > 20 {
                format!("\n... and {} more", failures.len() - 20)
            } else {
                String::new()
            }
        );
    }

    println!(
        "Cart items: {}/{} tests passed",
        total_tests - failures.len(),
        total_tests
    );
}

/// Validate cart_has_item against get_cart_for_day - no false positives or negatives
/// For each cart day in golden data:
/// - Every item returned by get_cart_for_day must return true from cart_has_item
/// - A sample of items NOT in the cart must return false
#[test]
fn test_cart_has_item_comprehensive() {
    use rasmodius::mechanics::traveling_cart::{cart_has_item, get_cart_for_day};

    let data = load_golden_data();
    let mut false_negatives: Vec<String> = Vec::new();
    let mut false_positives: Vec<String> = Vec::new();
    let mut total_positive_tests = 0;
    let mut total_negative_tests = 0;

    // Some item IDs to test as negatives (common items that should sometimes NOT be in cart)
    let negative_test_items: [i32; 10] = [16, 78, 128, 174, 176, 188, 266, 417, 430, 724];

    for seed_data in &data.seeds {
        let seed = seed_data.seed;

        for version in [
            GameVersion::V1_3,
            GameVersion::V1_4,
            GameVersion::V1_5,
            GameVersion::V1_6,
        ] {
            let version_data = get_version_data(&seed_data.versions, version);

            for test in &version_data.cart {
                // Get the actual cart items using get_cart_for_day (already validated by other test)
                let cart = get_cart_for_day(seed, test.day, version);
                let cart_ids: std::collections::HashSet<i32> =
                    cart.iter().map(|item| item.item_id).collect();

                // Test positive cases: every item in cart should return true
                for item in &cart {
                    total_positive_tests += 1;
                    if !cart_has_item(seed, test.day, item.item_id, version) {
                        false_negatives.push(format!(
                            "FALSE NEGATIVE: seed={} day={} v={:?} item={}: expected true, got false",
                            seed, test.day, version, item.item_id
                        ));
                    }
                }

                // Test negative cases: items NOT in cart should return false
                for &item_id in &negative_test_items {
                    if !cart_ids.contains(&item_id) {
                        total_negative_tests += 1;
                        if cart_has_item(seed, test.day, item_id, version) {
                            false_positives.push(format!(
                                "FALSE POSITIVE: seed={} day={} v={:?} item={}: expected false, got true",
                                seed, test.day, version, item_id
                            ));
                        }
                    }
                }
            }
        }
    }

    let total_failures = false_negatives.len() + false_positives.len();
    if total_failures > 0 {
        let mut sample: Vec<String> = Vec::new();
        sample.extend(false_negatives.iter().take(10).cloned());
        sample.extend(false_positives.iter().take(10).cloned());
        panic!(
            "\n{} false negatives, {} false positives out of {} positive tests and {} negative tests:\n{}{}",
            false_negatives.len(),
            false_positives.len(),
            total_positive_tests,
            total_negative_tests,
            sample.join("\n"),
            if total_failures > 20 {
                format!("\n... and {} more", total_failures - 20)
            } else {
                String::new()
            }
        );
    }

    println!(
        "cart_has_item: {} positive tests, {} negative tests - all passed",
        total_positive_tests, total_negative_tests
    );
}

// Daily luck and dish of day are version-independent mechanics
// We test against v1.6 data (all versions should have identical values)

#[test]
fn test_daily_luck_comprehensive() {
    use rasmodius::mechanics::daily_luck::daily_luck;

    let data = load_golden_data();
    let mut failures: Vec<String> = Vec::new();
    let mut total_tests = 0;

    for seed_data in &data.seeds {
        let seed = seed_data.seed;
        // Daily luck is version-independent, so just test v1.6 data
        let version_data = &seed_data.versions.v1_6;

        for test in &version_data.daily_luck {
            total_tests += 1;
            let actual = daily_luck(seed, test.day, 0, false);

            if (actual - test.luck).abs() > 0.00001 {
                failures.push(format!(
                    "daily_luck: seed={} day={}: expected={}, got={}",
                    seed, test.day, test.luck, actual
                ));
            }
        }
    }

    if !failures.is_empty() {
        let sample: String = failures.iter().take(20).cloned().collect::<Vec<_>>().join("\n");
        panic!(
            "\n{} daily luck failures out of {} tests:\n{}{}",
            failures.len(),
            total_tests,
            sample,
            if failures.len() > 20 {
                format!("\n... and {} more", failures.len() - 20)
            } else {
                String::new()
            }
        );
    }

    println!(
        "Daily luck: {}/{} tests passed",
        total_tests - failures.len(),
        total_tests
    );
}

#[test]
fn test_dish_of_day_comprehensive() {
    use rasmodius::mechanics::daily_luck::dish_of_the_day;

    let data = load_golden_data();
    let mut failures: Vec<String> = Vec::new();
    let mut total_tests = 0;

    for seed_data in &data.seeds {
        let seed = seed_data.seed;
        // Dish of day is version-independent, so just test v1.6 data
        let version_data = &seed_data.versions.v1_6;

        for test in &version_data.dish_of_day {
            total_tests += 1;
            let (actual, _qty) = dish_of_the_day(seed, test.day, 0);

            if actual != test.dish {
                failures.push(format!(
                    "dish_of_day: seed={} day={}: expected={}, got={}",
                    seed, test.day, test.dish, actual
                ));
            }
        }
    }

    if !failures.is_empty() {
        let sample: String = failures.iter().take(20).cloned().collect::<Vec<_>>().join("\n");
        panic!(
            "\n{} dish of day failures out of {} tests:\n{}{}",
            failures.len(),
            total_tests,
            sample,
            if failures.len() > 20 {
                format!("\n... and {} more", failures.len() - 20)
            } else {
                String::new()
            }
        );
    }

    println!(
        "Dish of day: {}/{} tests passed",
        total_tests - failures.len(),
        total_tests
    );
}

/// Quick sanity check that golden data loaded correctly
#[test]
fn test_golden_data_integrity() {
    let data = load_golden_data();

    assert_eq!(data.metadata.num_seeds, 100);
    assert_eq!(data.metadata.num_days, 1120);
    assert_eq!(data.seeds.len(), 100);

    // Check first seed has expected structure
    let first = &data.seeds[0];
    assert_eq!(first.versions.v1_3.night_events.len(), 1120);
    assert_eq!(first.versions.v1_6.night_events.len(), 1120);

    // Check we have cart data
    assert!(!first.versions.v1_3.cart.is_empty());
    assert!(!first.versions.v1_6.cart.is_empty());

    println!("Golden data integrity check passed");
    println!("  Reference: stardew-predictor @ {}", data.metadata.reference_commit);
    println!("  Generated: {}", data.metadata.generated_at);
}

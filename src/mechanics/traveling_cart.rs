use crate::rng::CSRandom;
use crate::GameVersion;
use std::collections::HashMap;
use xxhash_rust::xxh32::xxh32;

// Use the 1.6 object data from parent module
use super::cart_objects_1_6::CART_OBJECTS_1_6;

/// Pre-1.4 roll-to-ID mapping: converts raw RNG roll (2-789) to actual item ID
/// Generated from stardew-predictor using scripts/generate-cart-lookup-table.js
/// This uses the same name lookup + forward search algorithm as the game.
/// Index 0 = roll 2, index 787 = roll 789
#[rustfmt::skip]
const CART_ROLL_TO_ID_PRE14: [i32; 788] = [
    16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 18, 18, 20, 20, 22, 22, 24, 24,
    78, 78, 78, 78, 78, 78, 78, 78, 78, 78, 78, 78, 78, 78, 78, 78, 78, 78, 78, 78, 78, 78,
    78, 78, 78, 78, 78, 78, 78, 78, 78, 78, 78, 78, 78, 78, 78, 78, 78, 78, 78, 78, 78, 78,
    78, 78, 78, 78, 78, 78, 78, 78, 78, 78, 88, 88, 88, 88, 88, 88, 88, 88, 88, 88, 90, 90,
    92, 92, 128, 128, 128, 128, 128, 128, 128, 128, 128, 128, 128, 128, 128, 128, 128, 128, 128, 128, 128, 128,
    128, 128, 128, 128, 128, 128, 128, 128, 128, 128, 128, 128, 128, 128, 128, 128, 129, 130, 131, 132, 136, 136,
    136, 136, 137, 138, 139, 140, 141, 142, 143, 144, 145, 146, 147, 148, 149, 150, 151, 154, 154, 154, 155, 156,
    164, 164, 164, 164, 164, 164, 164, 164, 165, 167, 167, 174, 174, 174, 174, 174, 174, 174, 176, 176, 180, 180,
    180, 180, 182, 182, 184, 184, 186, 186, 188, 188, 190, 190, 192, 192, 194, 194, 195, 196, 197, 198, 199, 200,
    201, 202, 203, 204, 205, 206, 207, 208, 209, 210, 211, 212, 213, 214, 215, 216, 218, 218, 219, 220, 221, 222,
    223, 224, 225, 226, 227, 228, 229, 230, 231, 232, 233, 234, 235, 236, 237, 238, 239, 240, 241, 242, 243, 244,
    248, 248, 248, 248, 250, 250, 252, 252, 254, 254, 256, 256, 257, 258, 259, 260, 262, 262, 264, 264, 266, 266,
    268, 268, 270, 270, 272, 272, 274, 274, 276, 276, 278, 278, 280, 280, 281, 282, 283, 284, 286, 286, 287, 288,
    296, 296, 296, 296, 296, 296, 296, 296, 298, 298, 299, 300, 301, 302, 303, 304, 305, 306, 307, 308, 309, 310,
    311, 322, 322, 322, 322, 322, 322, 322, 322, 322, 322, 322, 323, 324, 325, 328, 328, 328, 329, 330, 331, 333,
    333, 334, 335, 336, 337, 338, 340, 340, 342, 342, 344, 344, 346, 346, 347, 348, 350, 350, 368, 368, 368, 368,
    368, 368, 368, 368, 368, 368, 368, 368, 368, 368, 368, 368, 368, 368, 369, 370, 371, 372, 376, 376, 376, 376,
    378, 378, 380, 380, 382, 382, 384, 384, 386, 386, 388, 388, 390, 390, 392, 392, 393, 394, 396, 396, 397, 398,
    399, 400, 401, 402, 404, 404, 405, 406, 407, 408, 409, 410, 411, 412, 414, 414, 415, 416, 417, 418, 420, 420,
    421, 422, 424, 424, 425, 426, 427, 428, 429, 430, 431, 432, 433, 436, 436, 436, 438, 438, 440, 440, 442, 442,
    444, 444, 446, 446, 453, 453, 453, 453, 453, 453, 453, 455, 455, 456, 457, 459, 459, 465, 465, 465, 465, 465,
    465, 466, 472, 472, 472, 472, 472, 472, 473, 474, 475, 476, 477, 478, 479, 480, 481, 482, 483, 484, 485, 486,
    487, 488, 489, 490, 491, 492, 493, 494, 495, 496, 497, 498, 499, 591, 591, 591, 591, 591, 591, 591, 591, 591,
    591, 591, 591, 591, 591, 591, 591, 591, 591, 591, 591, 591, 591, 591, 591, 591, 591, 591, 591, 591, 591, 591,
    591, 591, 591, 591, 591, 591, 591, 591, 591, 591, 591, 591, 591, 591, 591, 591, 591, 591, 591, 591, 591, 591,
    591, 591, 591, 591, 591, 591, 591, 591, 591, 591, 591, 591, 591, 591, 591, 591, 591, 591, 591, 591, 591, 591,
    591, 591, 591, 591, 591, 591, 591, 591, 591, 591, 591, 591, 591, 591, 591, 591, 591, 593, 593, 595, 595, 597,
    597, 599, 599, 604, 604, 604, 604, 604, 605, 606, 607, 608, 609, 610, 611, 612, 613, 618, 618, 618, 618, 618,
    621, 621, 621, 628, 628, 628, 628, 628, 628, 628, 629, 630, 631, 632, 633, 634, 635, 636, 637, 638, 648, 648,
    648, 648, 648, 648, 648, 648, 648, 648, 649, 651, 651, 684, 684, 684, 684, 684, 684, 684, 684, 684, 684, 684,
    684, 684, 684, 684, 684, 684, 684, 684, 684, 684, 684, 684, 684, 684, 684, 684, 684, 684, 684, 684, 684, 684,
    685, 686, 687, 691, 691, 691, 691, 692, 693, 694, 695, 698, 698, 698, 699, 700, 701, 702, 703, 704, 705, 706,
    707, 708, 709, 715, 715, 715, 715, 715, 715, 716, 717, 718, 719, 720, 721, 722, 723, 724, 725, 726, 727, 728,
    729, 730, 731, 732, 734, 734, 766, 766, 766, 766, 766, 766, 766, 766, 766, 766, 766, 766, 766, 766, 766, 766,
    766, 766, 766, 766, 766, 766, 766, 766, 766, 766, 766, 766, 766, 766, 766, 766, 767, 768, 769, 771, 771, 772,
    773, 787, 787, 787, 787, 787, 787, 787, 787, 787, 787, 787, 787, 787, 787, 16, 16, 16,
];

/// Valid cart items for 1.4+ - EXACT list from stardew-predictor's save.cartItems_1_4
#[rustfmt::skip]
const CART_ITEMS_1_4: [i32; 335] = [
    16, 18, 20, 22, 24, 78, 88, 90, 92, 128, 129, 130, 131, 132, 136, 137, 138, 139, 140,
    141, 142, 143, 144, 145, 146, 147, 148, 149, 150, 151, 154, 155, 156, 164, 165, 167,
    174, 176, 180, 182, 184, 186, 188, 190, 192, 194, 195, 196, 197, 198, 199, 200, 201,
    202, 203, 204, 205, 206, 207, 208, 209, 210, 211, 212, 213, 214, 215, 216, 218, 219,
    220, 221, 222, 223, 224, 225, 226, 227, 228, 229, 230, 231, 232, 233, 234, 235, 236,
    237, 238, 239, 240, 241, 242, 243, 244, 248, 250, 251, 252, 253, 254, 256, 257, 258,
    259, 260, 262, 264, 266, 268, 270, 271, 272, 273, 274, 276, 278, 280, 281, 282, 283,
    284, 286, 287, 288, 293, 296, 298, 299, 300, 301, 302, 303, 304, 306, 307, 309, 310,
    311, 322, 323, 324, 325, 328, 329, 330, 331, 333, 334, 335, 336, 337, 338, 340, 342,
    344, 346, 347, 348, 350, 368, 369, 370, 371, 372, 376, 378, 380, 382, 384, 386, 388,
    390, 392, 393, 394, 396, 397, 398, 399, 400, 401, 402, 404, 405, 406, 407, 408, 409,
    410, 411, 412, 414, 415, 416, 418, 420, 421, 422, 424, 425, 426, 427, 428, 429, 430,
    431, 432, 433, 436, 438, 440, 442, 444, 446, 453, 455, 456, 457, 459, 465, 466, 472,
    473, 474, 475, 476, 477, 478, 479, 480, 481, 482, 483, 484, 485, 486, 487, 488, 489,
    490, 491, 492, 493, 494, 495, 496, 497, 498, 499, 591, 593, 595, 597, 599, 604, 605,
    606, 607, 608, 609, 610, 611, 612, 613, 614, 618, 621, 628, 629, 630, 631, 632, 633,
    634, 635, 636, 637, 638, 648, 649, 651, 684, 685, 686, 687, 691, 692, 693, 694, 695,
    698, 699, 700, 701, 702, 703, 704, 705, 706, 707, 708, 709, 715, 716, 717, 718, 719,
    720, 721, 722, 723, 724, 725, 726, 727, 728, 729, 730, 731, 732, 733, 734, 766, 767,
    768, 769, 771, 772, 773, 787, 445, 267, 265, 269,
];

/// Check if an item ID is valid for the traveling cart (1.4+)
fn is_valid_cart_item_1_4(item_id: i32) -> bool {
    CART_ITEMS_1_4.contains(&item_id)
}

/// Look up the base price for an item (from 1.6 object data)
/// Returns 0 if item not found (shouldn't happen for valid cart items)
fn get_item_base_price(item_id: i32) -> i32 {
    CART_OBJECTS_1_6
        .iter()
        .find(|&&(id, _, _, _, _)| id == item_id)
        .map(|&(_, price, _, _, _)| price)
        .unwrap_or(0)
}

/// Hash-based seed generation for 1.6 (XXHash32)
/// Mimics StardewValley.Utility.CreateRandomSeed() / getHashFromArray()
fn get_random_seed_1_6(a: i32, b: i32) -> i32 {
    // Create Int32Array with the values (like JavaScript's Int32Array)
    let values = [a, b, 0, 0, 0];
    let bytes: Vec<u8> = values
        .iter()
        .flat_map(|&v| v.to_le_bytes())
        .collect();

    // XXHash32 with seed 0
    xxh32(&bytes, 0) as i32
}

/// A cart item with its ID, price, and quantity
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct CartItem {
    pub item_id: i32,
    pub price: i32,
    pub quantity: i32,
}

/// Generate the traveling cart stock for pre-1.4 (1.3)
/// Pre-1.4 uses a direct lookup table, no duplicate prevention
fn get_cart_stock_pre14(seed: i32) -> Vec<CartItem> {
    let mut rng = CSRandom::new(seed);
    let mut stock = Vec::with_capacity(10);

    for _ in 0..10 {
        // Roll to get index into lookup table
        let roll = rng.next_range(2, 790);

        // Direct lookup - no duplicate prevention in pre-1.4
        let item_id = CART_ROLL_TO_ID_PRE14[(roll - 2) as usize];

        // Get item base price for scaled pricing
        let base_price = get_item_base_price(item_id);

        // Price: max(rng.Next(1,11) * 100, rng.Next(3,6) * basePrice)
        let random_price = rng.next_range(1, 11) * 100;
        let scaled_price = rng.next_range(3, 6) * base_price;
        let price = random_price.max(scaled_price);
        let quantity = if rng.sample() < 0.1 { 5 } else { 1 };

        stock.push(CartItem {
            item_id,
            price,
            quantity,
        });
    }

    stock
}

/// Generate the traveling cart stock for version 1.4+
/// 1.4+ uses increment-until-valid with duplicate prevention
/// IMPORTANT: Price/quantity RNG calls happen for EVERY valid item tested,
/// even if that item is already seen and gets skipped!
fn get_cart_stock_1_4_plus(seed: i32) -> Vec<CartItem> {
    let mut rng = CSRandom::new(seed);
    let mut stock = Vec::with_capacity(10);
    let mut seen_names: std::collections::HashSet<i32> = std::collections::HashSet::new();

    for _ in 0..10 {
        let mut item_id = rng.next_range(2, 790);

        let final_item_id;
        let final_price;
        let final_quantity;

        // Search for valid item, consuming RNG for each valid item we test
        loop {
            item_id = (item_id + 1) % 790;

            if is_valid_cart_item_1_4(item_id) {
                // Get item base price for scaled pricing
                let base_price = get_item_base_price(item_id);

                // Price and quantity RNG calls happen for EVERY valid item, not just the final one
                let random_price = rng.next_range(1, 11) * 100;
                let scaled_price = rng.next_range(3, 6) * base_price;
                let price = random_price.max(scaled_price);
                let quantity = if rng.sample() < 0.1 { 5 } else { 1 };

                // Only accept if not already seen
                if !seen_names.contains(&item_id) {
                    seen_names.insert(item_id);
                    final_item_id = item_id;
                    final_price = price;
                    final_quantity = quantity;
                    break;
                }
                // If already seen, continue searching (RNG already consumed)
            }
        }

        stock.push(CartItem {
            item_id: final_item_id,
            price: final_price,
            quantity: final_quantity,
        });
    }

    stock
}

/// Generate the traveling cart stock for version 1.6
/// 1.6 uses shuffle-based selection with getRandomItems()
fn get_cart_stock_v16(game_id: i32, day: i32) -> Vec<CartItem> {
    // Seed: getRandomSeed(day, gameId/2) - hash-based
    let seed = get_random_seed_1_6(day, game_id / 2);
    let mut rng = CSRandom::new(seed);

    // ============================================================================
    // COLLISION BEHAVIOR - SEE COLLISION_ERRATA.md
    // ============================================================================
    // stardew-predictor uses a JavaScript object as a dictionary:
    //     shuffledItems[key] = id;  (stardew-predictor.js line 4988)
    //
    // When two items get the same shuffle key from rng.Next(), the LATER item
    // overwrites the earlier one. We use a HashMap to match this behavior.
    //
    // Known collision case: gameID=25831481, day=21
    //   - Iron Ore (_380) and Crystal Path (_409) both get key 40973442
    //   - Crystal Path wins because it's processed later (iteration 310 vs 287)
    //
    // This MAY OR MAY NOT match the actual game. See COLLISION_ERRATA.md for
    // validation instructions. If the game behaves differently, update both
    // stardew-predictor and this implementation.
    // ============================================================================

    // Step 1: Generate shuffle keys for ALL objects (rng.Next() is called for each)
    // Use HashMap so later items overwrite earlier ones on key collision (matches JS object behavior)
    // Object data: (id, price, offlimits, category, type_excluded)
    let mut shuffle_map: HashMap<i32, (i32, i32)> = HashMap::new(); // key -> (id, price)

    for &(id, price, offlimits, _category, _type_excluded) in CART_OBJECTS_1_6 {
        // IMPORTANT: rng.Next() is called FIRST for EVERY object, before any filtering
        let key = rng.next(None, None);

        // Initial filters (from getRandomItems):
        // requirePrice && price == 0 -> skip (but rng was already called)
        if price == 0 {
            continue;
        }
        // isRandomSale && offlimits -> skip (but rng was already called)
        if offlimits {
            continue;
        }
        // Only include objects in range 2-789 (but rng was already called)
        if id < 2 || id > 789 {
            continue;
        }

        // Insert into HashMap - later items overwrite earlier ones with same key
        shuffle_map.insert(key, (id, price));
    }

    // Step 2: Convert to Vec and sort by key (ascending - matches JS object iteration for numeric keys)
    let mut shuffle_items: Vec<(i32, i32, i32)> = shuffle_map
        .into_iter()
        .map(|(key, (id, price))| (key, id, price))
        .collect();
    shuffle_items.sort_by_key(|&(key, _, _)| key);

    // Step 3: Apply category checks and take first 10
    // Object data: (id, price, offlimits, category, type_excluded)
    let mut selected_items: Vec<(i32, i32)> = Vec::new(); // (id, price)

    for &(_, id, price) in &shuffle_items {
        // Find the object data to check category
        if let Some(&(_, _, _, category, type_excluded)) =
            CART_OBJECTS_1_6.iter().find(|&&(obj_id, _, _, _, _)| obj_id == id)
        {
            // Category checks (doCategoryChecks=true):
            // Skip if category >= 0 or category === -999
            if category >= 0 || category == -999 {
                continue;
            }
            // Skip if type is 'Arch', 'Minerals', or 'Quest' (type_excluded=true)
            if type_excluded {
                continue;
            }

            selected_items.push((id, price));
            if selected_items.len() >= 10 {
                break;
            }
        }
    }

    // Step 4: Calculate price and quantity for each selected item
    let mut stock = Vec::with_capacity(10);

    for (item_id, base_price) in selected_items {
        // Price: max(rng.Next(1,11) * 100, rng.Next(3,6) * basePrice)
        let random_price = rng.next_range(1, 11) * 100;
        let scaled_price = rng.next_range(3, 6) * base_price;
        let price = random_price.max(scaled_price);

        // Quantity: 10% chance for 5, else 1
        let quantity = if rng.sample() < 0.1 { 5 } else { 1 };

        stock.push(CartItem {
            item_id,
            price,
            quantity,
        });
    }

    stock
}

/// Generate the traveling cart stock - version aware
pub fn get_traveling_cart_stock(seed: i32, version: GameVersion) -> Vec<CartItem> {
    match version {
        GameVersion::V1_3 => get_cart_stock_pre14(seed),
        GameVersion::V1_4 | GameVersion::V1_5 => get_cart_stock_1_4_plus(seed),
        GameVersion::V1_6 => {
            // 1.6 uses different seeding and algorithm, handled by get_cart_for_day_v16
            // This function is kept for compatibility but 1.6 should use get_cart_for_day
            vec![]
        }
    }
}

/// Get traveling cart stock for a specific game and day
pub fn get_cart_for_day(game_id: i32, day_number: i32, version: GameVersion) -> Vec<CartItem> {
    match version {
        GameVersion::V1_6 => get_cart_stock_v16(game_id, day_number),
        _ => get_traveling_cart_stock(game_id.wrapping_add(day_number), version),
    }
}

/// Check if the traveling cart has a specific item on a given day
pub fn cart_has_item(game_id: i32, day_number: i32, target_item: i32, version: GameVersion) -> bool {
    match version {
        GameVersion::V1_6 => cart_has_item_v16_fast(game_id, day_number, target_item),
        GameVersion::V1_4 | GameVersion::V1_5 => {
            cart_has_item_1_4_fast(game_id.wrapping_add(day_number), target_item)
        }
        GameVersion::V1_3 => cart_has_item_pre14_fast(game_id.wrapping_add(day_number), target_item),
    }
}

/// Fast cart item check for pre-1.4 - no allocations
fn cart_has_item_pre14_fast(seed: i32, target_item: i32) -> bool {
    let mut rng = CSRandom::new(seed);

    for _ in 0..10 {
        let roll = rng.next_range(2, 790);
        let item_id = CART_ROLL_TO_ID_PRE14[(roll - 2) as usize];

        // Skip price/quantity RNG calls - we don't need them for has_item check
        // But we MUST consume them to maintain RNG sequence
        let _ = rng.next_range(1, 11); // random_price part 1
        let _ = rng.next_range(3, 6); // scaled_price part 2
        let _ = rng.sample(); // quantity check

        if item_id == target_item {
            return true;
        }
    }
    false
}

/// Fast cart item check for 1.4/1.5 - uses fixed-size array instead of HashSet
fn cart_has_item_1_4_fast(seed: i32, target_item: i32) -> bool {
    let mut rng = CSRandom::new(seed);
    // Fixed-size array for seen items (max 10 items, but we might check more due to duplicates)
    let mut seen: [i32; 10] = [0; 10];
    let mut seen_count = 0;

    for _ in 0..10 {
        let mut item_id = rng.next_range(2, 790);

        loop {
            item_id = (item_id + 1) % 790;

            if is_valid_cart_item_1_4(item_id) {
                // Consume RNG for price/quantity (must happen for every valid item tested)
                let _ = rng.next_range(1, 11);
                let _ = rng.next_range(3, 6);
                let _ = rng.sample();

                // Check if already seen using linear scan (fast for 10 items)
                let mut already_seen = false;
                for i in 0..seen_count {
                    if seen[i] == item_id {
                        already_seen = true;
                        break;
                    }
                }

                if !already_seen {
                    if item_id == target_item {
                        return true;
                    }
                    seen[seen_count] = item_id;
                    seen_count += 1;
                    break;
                }
            }
        }
    }
    false
}

/// Fast cart item check for 1.6 - avoids HashMap and full sort
/// Uses fixed-size arrays and tracks only what's needed
fn cart_has_item_v16_fast(game_id: i32, day: i32, target_item: i32) -> bool {
    let seed = get_random_seed_1_6(day, game_id / 2);
    let mut rng = CSRandom::new(seed);

    // We need to track items with their shuffle keys to find the 10 lowest
    // Use a fixed-size array, handling collisions by overwriting (later wins)
    // Format: (key, id) - we don't need price for has_item check
    const MAX_CANDIDATES: usize = 512; // More than enough for filtered items
    let mut candidates: [(i32, i32); MAX_CANDIDATES] = [(i32::MAX, 0); MAX_CANDIDATES];
    let mut candidate_count: usize = 0;

    // Step 1: Generate shuffle keys for all objects
    for &(id, price, offlimits, category, type_excluded) in CART_OBJECTS_1_6 {
        let key = rng.next(None, None);

        // Apply all filters
        if price == 0 || offlimits || id < 2 || id > 789 {
            continue;
        }
        // Category checks
        if category >= 0 || category == -999 || type_excluded {
            continue;
        }

        // Handle collision: find if key exists, overwrite if so
        let mut found_slot = false;
        for i in 0..candidate_count {
            if candidates[i].0 == key {
                candidates[i] = (key, id); // Later overwrites earlier
                found_slot = true;
                break;
            }
        }
        if !found_slot && candidate_count < MAX_CANDIDATES {
            candidates[candidate_count] = (key, id);
            candidate_count += 1;
        }
    }

    // Step 2: Find the 10 items with lowest keys using partial selection
    // We use a simple approach: find min 10 times
    let mut selected_count = 0;
    let mut used: [bool; MAX_CANDIDATES] = [false; MAX_CANDIDATES];

    while selected_count < 10 && selected_count < candidate_count {
        // Find minimum unused key
        let mut min_idx = usize::MAX;
        let mut min_key = i32::MAX;
        for i in 0..candidate_count {
            if !used[i] && candidates[i].0 < min_key {
                min_key = candidates[i].0;
                min_idx = i;
            }
        }

        if min_idx == usize::MAX {
            break;
        }

        used[min_idx] = true;
        if candidates[min_idx].1 == target_item {
            return true;
        }
        selected_count += 1;
    }

    false
}

/// Find the first cart day (Friday or Sunday) where a target item appears
/// Returns (day_number, price, quantity) or None if not found in range
pub fn find_item_in_cart(
    game_id: i32,
    target_item: i32,
    max_days: i32,
    version: GameVersion,
) -> Option<(i32, i32, i32)> {
    let mut day = 5; // First Friday

    while day <= max_days {
        for cart_day in [day, day + 2].iter() {
            if *cart_day <= max_days {
                let stock = get_cart_for_day(game_id, *cart_day, version);
                if let Some(item) = stock.iter().find(|i| i.item_id == target_item) {
                    return Some((*cart_day, item.price, item.quantity));
                }
            }
        }
        day += 7;
    }

    None
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_cart_returns_10_items() {
        let stock = get_traveling_cart_stock(12345, GameVersion::V1_5);
        assert_eq!(stock.len(), 10);
    }

    #[test]
    fn test_cart_items_unique_1_4_plus() {
        // 1.4+ should have unique items
        let stock = get_traveling_cart_stock(12345, GameVersion::V1_5);
        let mut seen = std::collections::HashSet::new();
        for item in &stock {
            assert!(seen.insert(item.item_id), "Duplicate item found in 1.4+ cart");
        }
    }

    #[test]
    fn test_cart_pre14_can_have_duplicates() {
        // Pre-1.4 can have duplicates - this is expected behavior
        // Just verify it returns 10 items without panicking
        let stock = get_traveling_cart_stock(12345, GameVersion::V1_3);
        assert_eq!(stock.len(), 10);
    }

    #[test]
    fn test_cart_items_valid_1_4() {
        let stock = get_traveling_cart_stock(12345, GameVersion::V1_4);
        for item in &stock {
            assert!(
                is_valid_cart_item_1_4(item.item_id),
                "Invalid cart item: {}",
                item.item_id
            );
        }
    }

    #[test]
    fn test_cart_deterministic() {
        let stock1 = get_traveling_cart_stock(12345, GameVersion::V1_5);
        let stock2 = get_traveling_cart_stock(12345, GameVersion::V1_5);
        assert_eq!(stock1, stock2);
    }

    #[test]
    fn test_cart_quantity_valid() {
        let stock = get_traveling_cart_stock(12345, GameVersion::V1_5);
        for item in &stock {
            assert!(
                item.quantity == 1 || item.quantity == 5,
                "Invalid quantity: {}",
                item.quantity
            );
        }
    }

    #[test]
    fn test_find_item_red_cabbage() {
        let result = find_item_in_cart(12345, 266, 224, GameVersion::V1_5);
        assert!(result.is_some(), "Should find Red Cabbage within 2 years");
    }

    #[test]
    fn test_overflow_handling() {
        let stock = get_cart_for_day(i32::MAX, 5, GameVersion::V1_5);
        assert_eq!(stock.len(), 10);
    }

    #[test]
    fn test_version_difference() {
        // The same seed should give different results for 1.3 vs 1.4+
        let v13 = get_traveling_cart_stock(12350, GameVersion::V1_3);
        let v14 = get_traveling_cart_stock(12350, GameVersion::V1_4);
        // They may be same or different depending on rolls, but both should work
        assert_eq!(v13.len(), 10);
        assert_eq!(v14.len(), 10);
    }

    #[test]
    fn test_debug_cart_v16() {
        let cart = get_cart_for_day(1, 5, GameVersion::V1_6);
        println!("Cart for seed=1, day=5, v1.6:");
        for (i, item) in cart.iter().enumerate() {
            println!("[{}] id={} price={} qty={}", i, item.item_id, item.price, item.quantity);
        }
        // Expected from stardew-predictor:
        // [0] Sashimi (id=227) price=600 qty=1
        // [1] Artichoke Seeds (id=489) price=500 qty=1
        // etc.
        assert_eq!(cart.len(), 10);
    }
}

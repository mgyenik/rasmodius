# Shuffle Key Collision Behavior in stardew-predictor

## Summary

When stardew-predictor's `getRandomItems()` function generates shuffle keys for the 1.6 traveling cart algorithm, it uses a JavaScript object as a dictionary where the shuffle key (from `rng.Next()`) is used as the property name. When two different items receive the same shuffle key (a collision), the later item silently overwrites the earlier one due to JavaScript's object property assignment semantics.

**This may or may not match the actual game behavior.** This document exists to track this edge case for validation against the real game.

## Affected Code

**File:** `stardew-predictor.js`
**Function:** `getRandomItems()` (lines 4970-5007)
**Critical line:** 4988

```javascript
// stardew-predictor.js lines 4974-4990
var shuffledItems = {};                              // Line 4974
for (const id in save[type]) {                       // Line 4975
    var key = rng.Next();                            // Line 4976
    if (isNaN(save[type][id].id)) {                  // Line 4977
        continue;
    }
    if (requirePrice && save[type][id].price == 0) { // Line 4980
        continue;
    }
    if (isRandomSale && save[type][id].offlimits) {  // Line 4983
        continue;
    }
    var index = parseInt(save[type][id].id);         // Line 4986
    if (index >= min && index <= max) {
        shuffledItems[key] = id;                     // Line 4988 - COLLISION POINT
    }
}
```

At line 4988, if `key` already exists in `shuffledItems`, the new `id` overwrites the previous one. This is standard JavaScript behavior but may not match the game's C# implementation.

## Reproduction Case

The following specific parameters produce a collision:

| Parameter | Value |
|-----------|-------|
| gameID | 25831481 |
| day | 21 |
| version | 1.6 |
| RNG seed | -1939913319 |

**RNG seed calculation:**
```javascript
getRandomSeed(day, Math.floor(gameID / 2))
getRandomSeed(21, 12915740) = -1939913319
```

## Collision Details

During iteration over `save.objects`, two items receive identical shuffle keys:

| Iteration | Object Key | Item ID | Item Name | Shuffle Key |
|-----------|------------|---------|-----------|-------------|
| 287 | `_380` | 380 | Iron Ore | 40973442 |
| 310 | `_409` | 409 | Crystal Path | 40973442 |

**Result:** Iron Ore (processed first) is overwritten by Crystal Path (processed later).

**Cart position 9:**
- stardew-predictor output: Crystal Path (id=409)
- If both items were kept: Iron Ore would appear (lower iteration number, but same shuffle key)

## JavaScript Object Behavior

When using an object as a dictionary with numeric keys:

```javascript
var obj = {};
obj[40973442] = '_380';  // First assignment
obj[40973442] = '_409';  // Second assignment - OVERWRITES first
// obj[40973442] === '_409'
```

The `for...in` loop at line 4994 then iterates over `shuffledItems` in ascending numeric key order (JavaScript's default for integer-like keys), seeing only the surviving item.

## Questions for Validation

1. **Does the actual game use a data structure that handles collisions differently?**
   - C#'s `Dictionary<TKey, TValue>` would throw on duplicate keys
   - A `List` with sorting would preserve both items
   - The game might use a different shuffle algorithm entirely

2. **Is this collision scenario even possible in the real game?**
   - With 807 objects and `rng.Next()` returning values in [0, 2147483647], collision probability per cart generation is approximately:
     - P(at least one collision) ≈ 1 - e^(-n²/2m) ≈ 1 - e^(-807²/(2×2147483647)) ≈ 0.00015 (0.015%)
   - Over many seeds/days, collisions will occur

3. **If the game preserves both items, what determines their relative order?**
   - Stable sort by shuffle key? (iteration order preserved for ties)
   - Unstable sort? (undefined behavior for ties)

## Test Methodology

To validate against the actual game:

1. Create a save file with gameID = 25831481
2. Advance to day 21 (Spring 21, Year 1)
3. Visit the traveling cart
4. Check if position 9 (0-indexed) contains:
   - **Crystal Path** (matches stardew-predictor's collision behavior)
   - **Iron Ore** (indicates game preserves both items, earlier one wins)
   - **Something else** (indicates different algorithm entirely)

## Rasmodius Implementation

Rasmodius intentionally matches stardew-predictor's collision behavior for compatibility, using a HashMap where later items overwrite earlier ones with the same shuffle key. See the comment in `src/mechanics/traveling_cart.rs` at the `get_cart_stock_v16()` function.

If validation shows the game behaves differently, both stardew-predictor and Rasmodius should be updated.

---

*Document created: 2024-12-25*
*Related to: Rasmodius 1.6 cart implementation*

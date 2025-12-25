#!/usr/bin/env node
/**
 * Golden test extraction script
 *
 * Extracts expected RNG values from stardew-predictor for validation.
 * Run with: node scripts/extract-golden-tests.js
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

// Create a sandbox context for stardew-predictor code
// IMPORTANT: Buffer is required for xxhash to properly read ArrayBuffer data
const sandbox = { console, Math, Date, TextEncoder: require('util').TextEncoder, Buffer, Uint8Array, Int32Array, ArrayBuffer };

// Load xxhash from stardew-predictor
const xxhashPath = path.join(__dirname, '../../stardew-predictor/xxhash.min.js');
const xxhashCode = fs.readFileSync(xxhashPath, 'utf8');
vm.runInNewContext(xxhashCode, sandbox);
const XXH = sandbox.XXH;

// Load CSRandom from stardew-predictor
const csRandomPath = path.join(__dirname, '../../stardew-predictor/cs-random.js');
const csRandomCode = fs.readFileSync(csRandomPath, 'utf8');
vm.runInNewContext(csRandomCode, sandbox);
const CSRandom = sandbox.CSRandom;

// Constants matching C# Random
const INT_MIN = -2147483648;
const INT_MAX = 2147483647;

// Version comparison helper
function compareSemVer(a, b) {
    const partsA = a.split('.').map(Number);
    const partsB = b.split('.').map(Number);
    for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
        const vA = partsA[i] || 0;
        const vB = partsB[i] || 0;
        if (vA > vB) return 1;
        if (vA < vB) return -1;
    }
    return 0;
}

// Hash-based seed for 1.4+ (XXHash)
function getHashFromArray(...values) {
    const array = new Int32Array(values);
    const H = XXH.h32();
    return H.update(array.buffer).digest().toNumber();
}

// Seed generation (version-dependent)
function getRandomSeed(version, a, b = 0, c = 0, d = 0, e = 0) {
    const useLegacy = compareSemVer(version, "1.4") < 0;
    if (useLegacy) {
        return Math.floor((a % INT_MAX + b % INT_MAX + c % INT_MAX + d % INT_MAX + e % INT_MAX) % INT_MAX);
    } else {
        return getHashFromArray(a % INT_MAX, b % INT_MAX, c % INT_MAX, d % INT_MAX, e % INT_MAX);
    }
}

// Night event prediction
function getNightEvent(version, gameId, day) {
    // Event is rolled at 6am, but we display as previous night, so we use day+1
    const eventDay = day + 1;

    // Day 30 is always earthquake
    if (eventDay === 30) {
        return 'earthquake';
    }

    const month = Math.floor((day - 1) / 28) % 4; // 0=spring, 1=summer, 2=fall, 3=winter
    const year = 1 + Math.floor((day - 1) / 112);

    let rng;
    if (compareSemVer(version, "1.6") >= 0) {
        rng = new CSRandom(getRandomSeed(version, eventDay, Math.floor(gameId / 2)));
        // Prime RNG with 10 calls
        for (let i = 0; i < 10; i++) {
            rng.NextDouble();
        }
        // Skip greenhouse windstorm check (assume no greenhouse)
        const roll1 = rng.NextDouble();
        if (roll1 < 0.01 && month < 3) return 'fairy';
        if (rng.NextDouble() < 0.01 && eventDay > 20) return 'witch';
        if (rng.NextDouble() < 0.01 && eventDay > 5) return 'meteor';
        if (rng.NextDouble() < 0.005) return 'owl';
        if (rng.NextDouble() < 0.008 && year > 1) return 'capsule';
        return 'none';
    } else {
        rng = new CSRandom(Math.floor(gameId / 2) + eventDay);

        // Pre-1.3 baby check skipped (assume no spouse)

        if (rng.NextDouble() < 0.01 && month < 3) return 'fairy';
        if (rng.NextDouble() < 0.01) return 'witch';
        if (rng.NextDouble() < 0.01) return 'meteor';

        if (compareSemVer(version, "1.5") < 0) {
            if (rng.NextDouble() < 0.01 && year > 1) return 'capsule';
            if (rng.NextDouble() < 0.01) return 'owl';
        } else if (compareSemVer(version, "1.5.3") < 0) {
            if (rng.NextDouble() < 0.008 && year > 1) return 'capsule';
            if (rng.NextDouble() < 0.008) return 'owl';
        } else {
            if (rng.NextDouble() < 0.005) return 'owl';
            if (rng.NextDouble() < 0.008 && year > 1) return 'capsule';
        }
        return 'none';
    }
}

// Geode contents (simplified - just get the first roll for mineral/ore decision)
function getGeodeRoll(version, gameId, geodeNumber, playerId = 0) {
    let rng;
    if (compareSemVer(version, "1.6") >= 0) {
        rng = new CSRandom(getRandomSeed(version, geodeNumber, Math.floor(gameId / 2), Math.floor(playerId / 2)));
    } else {
        rng = new CSRandom(geodeNumber + Math.floor(gameId / 2));
    }

    // 1.4+ warmup
    if (compareSemVer(version, "1.4") >= 0) {
        let prewarm1 = rng.Next(1, 10);
        for (let j = 0; j < prewarm1; j++) {
            rng.NextDouble();
        }
        let prewarm2 = rng.Next(1, 10);
        for (let i = 0; i < prewarm2; i++) {
            rng.NextDouble();
        }
        // 1.5+ Qi bean check
        if (compareSemVer(version, "1.5") >= 0) {
            rng.NextDouble();
        }
    }

    // Main roll - determines mineral vs ore
    const roll = rng.NextDouble();

    // 1.6 reversed the check
    const getMineral = compareSemVer(version, "1.6") >= 0 ? (roll < 0.5) : !(roll < 0.5);

    return { roll, getMineral };
}

// Mine floor monster check
function isMonsterFloor(version, gameId, day, level) {
    let rng;
    if (compareSemVer(version, "1.4") >= 0) {
        rng = new CSRandom(getRandomSeed(version, day, Math.floor(gameId / 2), level * 100));
    } else {
        rng = new CSRandom(day + level + Math.floor(gameId / 2));
    }

    // Check for infested floor
    if (level % 40 > 5 && level % 40 < 30 && level % 40 !== 19) {
        if (rng.NextDouble() < 0.044) {
            return rng.NextDouble() < 0.5; // true = monster, false = slime
        }
    }
    return false;
}

// Pre-1.4 roll-to-ID mapping: converts raw RNG roll (2-789) to actual item ID
// This is derived from stardew-predictor's save.cartItems name lookup table
// 788 elements: index 0 = roll 2, index 787 = roll 789
const CART_ROLL_TO_ID_PRE14 = [
    16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 18, 18, 20, 20, 22, 22, 24, 24,
    78, 78, 78, 78, 78, 78, 78, 78, 78, 78, 78, 78, 78, 78, 78, 78, 78, 78, 78, 78, 78, 78,
    78, 78, 78, 78, 78, 78, 78, 78, 78, 78, 78, 78, 78, 78, 78, 78, 78, 78, 78, 78, 78, 78,
    78, 78, 78, 78, 78, 78, 78, 78, 78, 78, 88, 88, 88, 88, 88, 88, 88, 88, 88, 88, 90, 90,
    92, 92, 128, 128, 128, 128, 128, 128, 128, 128, 128, 128, 128, 128, 128, 128, 128, 128, 128, 128, 128, 128,
    128, 128, 128, 128, 128, 128, 128, 128, 128, 128, 128, 128, 128, 128, 128, 128, 129, 130, 131, 132, 136, 136,
    136, 136, 137, 138, 139, 140, 141, 142, 143, 144, 145, 146, 147, 148, 149, 150, 151, 154, 154, 154, 155, 156,
    164, 164, 164, 164, 164, 164, 164, 164, 165, 167, 167, 174, 174, 174, 174, 174, 174, 174, 174, 174, 176, 176,
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
    773, 787, 787, 787, 787, 787, 787, 787, 787, 787, 787, 787, 787, 787, 787, 16, 16, 16
];

// Valid cart items for 1.4+ - EXACT list from stardew-predictor's save.cartItems_1_4
// Extracted from stardew-predictor.js lines 984-1320
const CART_ITEMS_1_4 = new Set([
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
    768, 769, 771, 772, 773, 787, 445, 267, 265, 269
]);

// Traveling cart stock - version-specific implementations
function getCartItemIds(version, gameId, day) {
    if (compareSemVer(version, "1.6") >= 0) {
        // 1.6 cart uses completely different Data/Shops system
        // TODO: Implement 1.6 cart when needed
        return [];
    }

    const rng = new CSRandom(gameId + day);
    const items = [];
    const seenItems = new Set();

    // Cart has 10 slots
    for (let slot = 0; slot < 10; slot++) {
        let itemId = rng.Next(2, 790);

        if (compareSemVer(version, "1.4") >= 0) {
            // 1.4+: increment until finding valid item not already seen
            while (true) {
                itemId = (itemId + 1) % 790;
                if (CART_ITEMS_1_4.has(itemId) && !seenItems.has(itemId)) {
                    break;
                }
            }
            seenItems.add(itemId);
        } else {
            // Pre-1.4 (1.3): direct lookup from roll, no duplicate prevention
            // The roll (2-789) maps to an item ID via the lookup table
            itemId = CART_ROLL_TO_ID_PRE14[itemId - 2];
            // Note: Pre-1.4 can have duplicate items in cart
        }

        items.push(itemId);

        // Consume RNG for price and quantity
        rng.Next(1, 11); // price multiplier 1
        rng.Next(3, 6);  // price multiplier 2 (base_price * this)
        rng.NextDouble(); // quantity check (< 0.1 = 5, else 1)
    }

    return items;
}

// Daily luck calculation
function getDailyLuck(version, gameId, day, steps = 0, hasFriends = false) {
    // Note: Daily luck uses a specific seeding pattern from the game
    const localDay = day - 1;
    const rngSeed = Math.floor(gameId / 100) + localDay * 10 + 1 + steps;
    const rng = new CSRandom(rngSeed);

    // Dish of the day advances RNG
    const dayOfMonth = localDay > 0 ? ((localDay - 1) % 28) + 1 : 0;
    for (let i = 0; i < dayOfMonth; i++) {
        rng.NextDouble();
    }

    // Pick dish (excluded: 346, 196, 216, 224, 206, 395, 217)
    const excluded = [346, 196, 216, 224, 206, 395, 217];
    let dish = rng.Next(194, 240);
    while (excluded.includes(dish)) {
        dish = rng.Next(194, 240);
    }

    // Quantity
    const bonus = rng.NextDouble() < 0.08 ? 10 : 0;
    rng.Next(1, 4 + bonus);

    // Object constructor sample
    rng.NextDouble();

    // Friends check
    if (hasFriends) {
        rng.NextDouble();
        rng.NextDouble();
    }

    // Rarecrow society
    rng.NextDouble();

    // Daily luck roll
    const luckRoll = rng.Next(-100, 101);
    return Math.min(luckRoll / 1000.0, 0.1);
}

// Generate test cases
function generateTests() {
    const versions = ['1.3', '1.4', '1.5', '1.6'];
    const testSeeds = [12345, 99999, 1, 2147483647, 123456789];
    const testDays = [1, 5, 10, 28, 29, 56, 100];

    const results = {
        daily_luck: [],
        night_events: [],
        geodes: [],
        mine_floors: [],
        cart_items: []
    };

    for (const version of versions) {
        for (const seed of testSeeds) {
            // Daily luck tests
            for (const day of testDays) {
                const luck = getDailyLuck(version, seed, day, 0, false);
                results.daily_luck.push({
                    version,
                    seed,
                    day,
                    steps: 0,
                    has_friends: false,
                    expected: luck
                });
            }

            // Night event tests
            for (const day of testDays) {
                const event = getNightEvent(version, seed, day);
                results.night_events.push({
                    version,
                    seed,
                    day,
                    expected: event
                });
            }

            // Geode tests
            for (const geodeNum of [1, 5, 10, 50, 100]) {
                const { roll, getMineral } = getGeodeRoll(version, seed, geodeNum);
                results.geodes.push({
                    version,
                    seed,
                    geode_number: geodeNum,
                    roll,
                    get_mineral: getMineral
                });
            }

            // Mine floor tests (check levels 10, 20, 41, 81, 100)
            for (const level of [10, 20, 41, 81, 100]) {
                const isMonster = isMonsterFloor(version, seed, 1, level);
                results.mine_floors.push({
                    version,
                    seed,
                    day: 1,
                    level,
                    is_monster: isMonster
                });
            }

            // Cart item tests (1.3-1.5, not 1.6 which uses Data/Shops)
            if (compareSemVer(version, "1.6") < 0) {
                for (const day of [5, 7, 12]) { // Friday/Sunday
                    const items = getCartItemIds(version, seed, day);
                    results.cart_items.push({
                        version,
                        seed,
                        day,
                        item_ids: items // All 10 items
                    });
                }
            }
        }
    }

    return results;
}

// Main
const tests = generateTests();

// Write to JSON file
const outputPath = path.join(__dirname, '../tests/golden_values.json');
fs.writeFileSync(outputPath, JSON.stringify(tests, null, 2));
console.log(`Generated ${tests.daily_luck.length} daily luck tests`);
console.log(`Generated ${tests.night_events.length} night event tests`);
console.log(`Generated ${tests.geodes.length} geode tests`);
console.log(`Generated ${tests.mine_floors.length} mine floor tests`);
console.log(`Generated ${tests.cart_items.length} cart item tests`);
console.log(`\nOutput written to: ${outputPath}`);

// Also output a sample for verification
console.log('\nSample results:');
console.log('Daily luck (seed=12345, day=1, v1.5):',
    tests.daily_luck.find(t => t.seed === 12345 && t.day === 1 && t.version === '1.5'));
console.log('Night event (seed=12345, day=29, v1.6):',
    tests.night_events.find(t => t.seed === 12345 && t.day === 29 && t.version === '1.6'));

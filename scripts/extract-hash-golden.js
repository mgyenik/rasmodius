#!/usr/bin/env node
/**
 * Extract XXHash32 golden values from stardew-predictor for testing our Rust implementation.
 * Also extract cart golden values using the proper stardew-predictor code paths.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

// Create sandbox with necessary globals
// IMPORTANT: Buffer is needed for xxhash to properly read ArrayBuffer data
const sandbox = {
    console,
    Math,
    Date,
    TextEncoder: require('util').TextEncoder,
    parseInt,
    isNaN,
    Number,
    Array,
    Object,
    String,
    Boolean,
    Error,
    JSON,
    undefined,
    Buffer,        // Critical for xxhash ArrayBuffer support
    Uint8Array,
    Int32Array,
    ArrayBuffer
};

// Load XXHash
const xxhashPath = path.join(__dirname, '../../stardew-predictor/xxhash.min.js');
const xxhashCode = fs.readFileSync(xxhashPath, 'utf8');
vm.runInNewContext(xxhashCode, sandbox);
const XXH = sandbox.XXH;

// Load CSRandom
const csRandomPath = path.join(__dirname, '../../stardew-predictor/cs-random.js');
const csRandomCode = fs.readFileSync(csRandomPath, 'utf8');
vm.runInNewContext(csRandomCode, sandbox);
const CSRandom = sandbox.CSRandom;

// Replicate the exact getHashFromArray function from stardew-predictor
function getHashFromArray(...values) {
    var array = new Int32Array(values);
    var H = XXH.h32();
    return H.update(array.buffer).digest().toNumber();
}

// Generate hash golden tests
console.log('=== XXHash32 Golden Values ===\n');

const hashTests = [];

// Test cases: (inputs, expected_hash)
const testInputs = [
    [5, 6172, 0, 0, 0],      // day=5, gameId/2=6172
    [7, 6172, 0, 0, 0],      // day=7, gameId/2=6172
    [12, 6172, 0, 0, 0],
    [14, 6172, 0, 0, 0],
    [1, 0, 0, 0, 0],         // Edge case: minimal
    [2147483647, 0, 0, 0, 0], // Edge case: max int
    [100, 50000, 777, 0, 0],  // 3 non-zero values
    [1, 2, 3, 4, 5],          // All non-zero
];

for (const inputs of testInputs) {
    const hash = getHashFromArray(...inputs);
    hashTests.push({ inputs, hash });
    console.log(`getHashFromArray(${inputs.join(', ')}) = ${hash}`);
}

// Write hash golden values
const hashGoldenPath = path.join(__dirname, '../tests/hash_golden_values.json');
fs.writeFileSync(hashGoldenPath, JSON.stringify({ hash_tests: hashTests }, null, 2));
console.log(`\nHash golden values written to: ${hashGoldenPath}`);

// Now test getRandomSeed with useLegacyRandom = false
console.log('\n=== getRandomSeed Golden Values (1.6 mode) ===\n');

// Replicate getRandomSeed for 1.6 (useLegacyRandom = false)
function getRandomSeed_1_6(a, b = 0, c = 0, d = 0, e = 0) {
    const INT_MAX = 2147483647;
    return getHashFromArray(a % INT_MAX, b % INT_MAX, c % INT_MAX, d % INT_MAX, e % INT_MAX);
}

const seedTests = [];
const seedInputs = [
    [5, 6172],           // day=5, gameId/2=6172 (gameId=12345)
    [7, 6172],           // day=7
    [12, 6172],          // day=12
    [5, 49999],          // day=5, gameId/2=49999 (gameId=99999)
    [7, 49999],
    [5, 0],              // day=5, gameId/2=0 (gameId=1)
    [7, 0],
];

for (const [a, b] of seedInputs) {
    const seed = getRandomSeed_1_6(a, b);
    seedTests.push({ a, b, seed });
    console.log(`getRandomSeed(${a}, ${b}) = ${seed}`);
}

// Now test cart with different seeds and days
console.log('\n=== Cart 1.6 Golden Values ===\n');

// Read objects from stardew-predictor
const predictorPath = path.join(__dirname, '../../stardew-predictor/stardew-predictor.js');
const predictorCode = fs.readFileSync(predictorPath, 'utf8');

// Extract save.objects from stardew-predictor
function parseObjectsFromPredictor(code) {
    const objects = {};
    const entryRegex = /"_(\d+)":\s*\{\s*'id':\s*"(\d+)",\s*'name':\s*"([^"]*)",\s*'type':\s*"([^"]*)",\s*'category':\s*(-?\d+),\s*'price':\s*(\d+),\s*'offlimits':\s*(true|false)\s*\}/g;

    let match;
    while ((match = entryRegex.exec(code)) !== null) {
        const key = parseInt(match[1]);
        objects['_' + key] = {
            id: match[2],
            name: match[3],
            type: match[4],
            category: parseInt(match[5]),
            price: parseInt(match[6]),
            offlimits: match[7] === 'true'
        };
    }
    return objects;
}

const objects = parseObjectsFromPredictor(predictorCode);
console.log(`Extracted ${Object.keys(objects).length} objects`);

// Replicate getRandomItems from stardew-predictor
function getRandomItems(rng, source, minID, maxID, doDupChecks, doPriceChecks, doCategoryChecks, limit) {
    // This matches the stardew-predictor getRandomItems function
    var candidates = {};
    for (var id = minID; id <= maxID; id++) {
        var obj = objects['_' + id];
        if (typeof obj === 'undefined') { continue; }

        // Generate key BEFORE any filtering (this is critical!)
        var key = rng.Next();

        // Now apply filters
        if (doPriceChecks && obj.price === 0) { continue; }
        if (doPriceChecks && obj.offlimits) { continue; }

        candidates[key] = id;
    }

    // Sort by key (ascending) and apply category checks
    var sortedKeys = Object.keys(candidates).map(k => parseInt(k)).sort((a, b) => a - b);
    var result = [];

    for (var i = 0; i < sortedKeys.length; i++) {
        var key = sortedKeys[i];
        var id = candidates[key];
        var obj = objects['_' + id];

        if (doCategoryChecks) {
            if (obj.category >= 0 || obj.category === -999) { continue; }
            if (obj.type === 'Arch' || obj.type === 'Minerals' || obj.type === 'Quest') { continue; }
        }

        if (doDupChecks) {
            // In our case limit=10 so no duplicate check needed within result
        }

        result.push(id);
        if (typeof limit !== 'undefined' && result.length >= limit) { break; }
    }

    return result;
}

// Test cart generation for different gameIds and days
const cartTests = [];
const testSeeds = [12345, 99999, 1, 2147483647, 123456789, 42, 1000000, 777777];
const testDays = [5, 7, 12, 14, 19, 21, 26, 28];

for (const gameId of testSeeds) {
    for (const day of testDays) {
        // 1.6 cart uses: getRandomSeed(day + dayAdjust, gameID/2)
        // For testing, dayAdjust = 0
        const seed = getRandomSeed_1_6(day, Math.floor(gameId / 2));
        const rng = new CSRandom(seed);
        const items = getRandomItems(rng, "objects", 2, 789, true, true, true, 10);

        cartTests.push({
            version: '1.6',
            seed: gameId,  // This is the gameId
            day,
            rng_seed: seed,  // Actual RNG seed for debugging
            item_ids: items
        });
    }
}

// Show first few results
console.log('\nFirst 4 cart test cases:');
for (let i = 0; i < 4; i++) {
    const t = cartTests[i];
    console.log(`gameId=${t.seed}, day=${t.day}, rng_seed=${t.rng_seed}: [${t.item_ids.slice(0,3).join(', ')}...]`);
}

// Also generate 1.3, 1.4, 1.5 cart tests using the old algorithm
// Pre-1.4 cart items lookup (roll ID -> item name)
const CART_ITEMS_PRE14 = {
    789: 'Wild Horseradish', 788: 'Wild Horseradish', 787: 'Wild Horseradish',
    786: 'Battery Pack', 785: 'Battery Pack', 784: 'Battery Pack', 783: 'Battery Pack',
    782: 'Battery Pack', 781: 'Battery Pack', 780: 'Battery Pack', 779: 'Battery Pack',
    778: 'Battery Pack', 777: 'Battery Pack', 776: 'Battery Pack', 775: 'Battery Pack',
    774: 'Battery Pack', 773: 'Battery Pack', 772: 'Life Elixir', 771: 'Oil of Garlic',
    770: 'Fiber', 769: 'Fiber', 768: 'Void Essence', 767: 'Solar Essence', 766: 'Bat Wing',
    765: 'Slime', 764: 'Slime', 763: 'Slime', 762: 'Slime', 761: 'Slime', 760: 'Slime',
    759: 'Slime', 758: 'Slime', 757: 'Slime', 756: 'Slime', 755: 'Slime', 754: 'Slime',
    753: 'Slime', 752: 'Slime', 751: 'Slime', 750: 'Slime', 749: 'Slime', 748: 'Slime',
    747: 'Slime', 746: 'Slime', 745: 'Slime', 744: 'Slime', 743: 'Slime', 742: 'Slime',
    741: 'Slime', 740: 'Slime', 739: 'Slime', 738: 'Slime', 737: 'Slime', 736: 'Slime',
    735: 'Slime', 734: 'Slime', 733: 'Woodskip', 732: 'Woodskip', 731: 'Crab Cakes',
    730: 'Maple Bar', 729: 'Lobster Bisque', 728: 'Escargot', 727: 'Fish Stew',
    726: 'Chowder', 725: 'Pine Tar', 724: 'Oak Resin', 723: 'Maple Syrup', 722: 'Oyster',
    721: 'Periwinkle', 720: 'Snail', 719: 'Shrimp', 718: 'Mussel', 717: 'Cockle',
    716: 'Crab', 715: 'Crayfish', 714: 'Lobster', 713: 'Lobster', 712: 'Lobster',
    711: 'Lobster', 710: 'Lobster', 709: 'Lobster', 708: 'Hardwood', 707: 'Halibut',
    706: 'Lingcod', 705: 'Shad', 704: 'Albacore', 703: 'Dorado', 702: 'Magnet',
    701: 'Chub', 700: 'Tilapia', 699: 'Bullhead', 698: 'Tiger Trout', 697: 'Sturgeon',
    696: 'Sturgeon', 695: 'Sturgeon', 694: 'Cork Bobber', 693: 'Trap Bobber',
    692: 'Treasure Hunter', 691: 'Lead Bobber', 690: 'Barbed Hook', 689: 'Barbed Hook',
    688: 'Barbed Hook', 687: 'Barbed Hook', 686: 'Dressed Spinner', 685: 'Spinner',
    684: 'Bait', 683: 'Bug Meat', 682: 'Bug Meat', 681: 'Bug Meat', 680: 'Bug Meat',
    679: 'Bug Meat', 678: 'Bug Meat', 677: 'Bug Meat', 676: 'Bug Meat', 675: 'Bug Meat',
    674: 'Bug Meat', 673: 'Bug Meat', 672: 'Bug Meat', 671: 'Bug Meat', 670: 'Bug Meat',
    669: 'Bug Meat', 668: 'Bug Meat', 667: 'Bug Meat', 666: 'Bug Meat', 665: 'Bug Meat',
    664: 'Bug Meat', 663: 'Bug Meat', 662: 'Bug Meat', 661: 'Bug Meat', 660: 'Bug Meat',
    659: 'Bug Meat', 658: 'Bug Meat', 657: 'Bug Meat', 656: 'Bug Meat', 655: 'Bug Meat',
    654: 'Bug Meat', 653: 'Bug Meat', 652: 'Bug Meat', 651: 'Bug Meat',
    650: 'Poppyseed Muffin', 649: 'Poppyseed Muffin', 648: 'Fiddlehead Risotto'
    // ... truncated for brevity - we only need to test the algorithm, not all items
};

// Name -> actual item ID mapping
const NAME_TO_ID = {
    'Wild Horseradish': 16, 'Daffodil': 18, 'Leek': 20, 'Dandelion': 22, 'Parsnip': 24,
    'Cave Carrot': 78, 'Coconut': 88, 'Cactus Fruit': 90, 'Sap': 92, 'Pufferfish': 128,
    'Anchovy': 129, 'Tuna': 130, 'Sardine': 131, 'Bream': 132, 'Largemouth Bass': 136,
    'Smallmouth Bass': 137, 'Rainbow Trout': 138, 'Salmon': 139, 'Walleye': 140,
    'Battery Pack': 787, 'Life Elixir': 773, 'Oil of Garlic': 772, 'Fiber': 771,
    'Void Essence': 769, 'Solar Essence': 768, 'Bat Wing': 767, 'Slime': 766,
    'Woodskip': 734, 'Crab Cakes': 732, 'Maple Bar': 731, 'Lobster Bisque': 730,
    'Escargot': 729, 'Fish Stew': 728, 'Chowder': 727, 'Pine Tar': 726, 'Oak Resin': 725,
    'Maple Syrup': 724, 'Oyster': 723, 'Periwinkle': 722, 'Snail': 721, 'Shrimp': 720,
    'Mussel': 719, 'Cockle': 718, 'Crab': 717, 'Crayfish': 716, 'Lobster': 715,
    'Hardwood': 709, 'Halibut': 708, 'Lingcod': 707, 'Shad': 706, 'Albacore': 705,
    'Dorado': 704, 'Magnet': 703, 'Chub': 702, 'Tilapia': 701, 'Bullhead': 700,
    'Tiger Trout': 699, 'Sturgeon': 698, 'Cork Bobber': 695, 'Trap Bobber': 694,
    'Treasure Hunter': 693, 'Lead Bobber': 692, 'Barbed Hook': 691, 'Dressed Spinner': 687,
    'Spinner': 686, 'Bait': 685, 'Bug Meat': 684, 'Poppyseed Muffin': 651,
    'Fiddlehead Risotto': 649
};

// Valid cart items for 1.4+
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

// Generate cart items for 1.4/1.5
function getCartItemIds_v14(gameId, day) {
    const rng = new CSRandom(gameId + day);
    const items = [];
    const seenItems = new Set();

    for (let slot = 0; slot < 10; slot++) {
        let itemId = rng.Next(2, 790);

        while (true) {
            itemId = (itemId + 1) % 790;
            if (CART_ITEMS_1_4.has(itemId) && !seenItems.has(itemId)) {
                break;
            }
        }

        seenItems.add(itemId);
        items.push(itemId);

        // Consume RNG for price and quantity
        rng.Next(1, 11);
        rng.Next(3, 6);
        rng.NextDouble();
    }

    return items;
}

// Combine all cart tests
const allCartTests = [];

for (const gameId of testSeeds) {
    for (const day of testDays) {
        // 1.4 and 1.5 (same algorithm)
        allCartTests.push({
            version: '1.4',
            seed: gameId,
            day,
            item_ids: getCartItemIds_v14(gameId, day)
        });

        allCartTests.push({
            version: '1.5',
            seed: gameId,
            day,
            item_ids: getCartItemIds_v14(gameId, day)
        });
    }
}

// Add 1.6 tests
for (const t of cartTests) {
    allCartTests.push({
        version: t.version,
        seed: t.seed,
        day: t.day,
        item_ids: t.item_ids
    });
}

// Write combined cart golden values
const cartGoldenPath = path.join(__dirname, '../tests/cart_golden_values.json');
fs.writeFileSync(cartGoldenPath, JSON.stringify({ cart_items: allCartTests }, null, 2));
console.log(`\nCart golden values written to: ${cartGoldenPath}`);
console.log(`Total cart tests: ${allCartTests.length}`);

// Also write seed golden values for debugging
const seedGoldenPath = path.join(__dirname, '../tests/seed_golden_values.json');
fs.writeFileSync(seedGoldenPath, JSON.stringify({ seed_tests: seedTests }, null, 2));
console.log(`Seed golden values written to: ${seedGoldenPath}`);

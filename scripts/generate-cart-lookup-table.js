#!/usr/bin/env node
/**
 * Generate the pre-1.4 cart lookup table from stardew-predictor.
 *
 * This script extracts the exact roll→itemID mapping from stardew-predictor's
 * save.cartItems structure to eliminate any transcription errors.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

// Load stardew-predictor
const predictorPath = path.join(__dirname, '../../stardew-predictor/stardew-predictor.js');
const predictorCode = fs.readFileSync(predictorPath, 'utf8');

// Extract save.cartItems from the code
// It's defined as save.cartItems = { 789: '...', 788: '...', ... };
const cartItemsMatch = predictorCode.match(/save\.cartItems\s*=\s*\{([^}]+)\}/);
if (!cartItemsMatch) {
    console.error('Could not find save.cartItems in stardew-predictor.js');
    process.exit(1);
}

// Extract save.objects to get the item name→id mapping
const objectsMatch = predictorCode.match(/save\.objects\s*=\s*\{/);
if (!objectsMatch) {
    console.error('Could not find save.objects in stardew-predictor.js');
    process.exit(1);
}

// Find the objects block
let objectsStart = objectsMatch.index + objectsMatch[0].length - 1;
let braceCount = 1;
let i = objectsStart + 1;
while (i < predictorCode.length && braceCount > 0) {
    if (predictorCode[i] === '{') braceCount++;
    else if (predictorCode[i] === '}') braceCount--;
    i++;
}
const objectsStr = predictorCode.slice(objectsStart, i);

// Parse save.objects into a name→id map
const saveObjects = eval('(' + objectsStr + ')');
const nameToId = {};
for (const key in saveObjects) {
    const obj = saveObjects[key];
    if (obj && obj.name && obj.id) {
        // Objects can have duplicate names, we want the first (smallest) ID
        const id = parseInt(obj.id);
        if (!nameToId[obj.name] || id < nameToId[obj.name]) {
            nameToId[obj.name] = id;
        }
    }
}

// Parse save.cartItems into a roll→name map
// Format: "789: 'Wild Horseradish', 788: 'Wild Horseradish', ..."
const cartItemsContent = cartItemsMatch[1];
const rollToName = {};

// Parse each entry
const entryPattern = /(\d+)\s*:\s*'([^']+)'/g;
let match;
while ((match = entryPattern.exec(cartItemsContent)) !== null) {
    const roll = parseInt(match[1]);
    const name = match[2];
    rollToName[roll] = name;
}

console.log(`Parsed ${Object.keys(rollToName).length} cart items`);
console.log(`Parsed ${Object.keys(nameToId).length} object names`);

// Now implement the stardew-predictor logic for pre-1.4:
// 1. Roll is in range [2, 790)
// 2. Look up save.cartItems[roll] to get item NAME
// 3. Starting at roll, search forward until save.objects[id].name matches
function getItemIdForRoll(roll) {
    const name = rollToName[roll];
    if (!name) {
        console.warn(`No name found for roll ${roll}`);
        return roll; // Fallback
    }

    // Search forward from roll to find matching item ID
    // The game does: while(save.objects[itemID].name !== name) { itemID++; itemID %= 790; }
    let itemId = roll;
    for (let attempt = 0; attempt < 800; attempt++) {
        const objKey = '_' + itemId;
        if (saveObjects[objKey] && saveObjects[objKey].name === name) {
            return itemId;
        }
        itemId++;
        itemId %= 790;
    }

    // If not found via search, try direct name lookup
    if (nameToId[name] !== undefined) {
        return nameToId[name];
    }

    console.warn(`Could not find item ID for roll ${roll} (name: "${name}")`);
    return roll;
}

// Generate the lookup table for rolls 2-789 (indices 0-787)
const lookupTable = [];
for (let roll = 2; roll < 790; roll++) {
    const itemId = getItemIdForRoll(roll);
    lookupTable.push(itemId);
}

console.log(`\nGenerated lookup table with ${lookupTable.length} entries`);

// Verify a few known values
console.log('\nVerification:');
console.log(`  Roll 2 -> ${lookupTable[0]} (should map to Wild Horseradish or similar)`);
console.log(`  Roll 722 -> ${lookupTable[720]} (checking for issue with 719 vs 723)`);
console.log(`  Roll 598 -> ${lookupTable[596]} (checking for issue with 595 vs 599)`);
console.log(`  Roll 789 -> ${lookupTable[787]} (last entry)`);

// Output as Rust array
console.log('\n// Rust lookup table (copy this to traveling_cart.rs):');
console.log('const CART_ROLL_TO_ID_PRE14: [i32; 788] = [');

const lines = [];
for (let i = 0; i < lookupTable.length; i += 22) {
    const chunk = lookupTable.slice(i, i + 22);
    lines.push('    ' + chunk.join(', ') + ',');
}
console.log(lines.join('\n'));
console.log('];');

// Also output as JSON for comparison
const outputPath = path.join(__dirname, '../tests/cart_lookup_table.json');
fs.writeFileSync(outputPath, JSON.stringify({ lookup_table: lookupTable }, null, 2));
console.log(`\nWritten to ${outputPath}`);

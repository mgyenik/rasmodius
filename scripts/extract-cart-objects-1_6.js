#!/usr/bin/env node
// Extract 1.6 cart object data by running stardew-predictor and dumping save.objects
// This ensures we get EXACTLY what stardew-predictor sees at runtime

const fs = require('fs');
const path = require('path');
const vm = require('vm');

// Create minimal context like the golden generation script
const context = {
    console, Math, Date, Object, Array, String, Number, RegExp, isNaN, parseInt, parseFloat, NaN, Infinity, undefined,
    TextEncoder: require('util').TextEncoder, Buffer, Uint8Array, Int32Array, BigInt, ArrayBuffer,
    $: function(s) {
        const self = {
            val: () => '', prop: () => false, html: () => self, text: () => self,
            append: () => self, empty: () => self, show: () => self, hide: () => self,
            addClass: () => self, removeClass: () => self, toggleClass: () => self,
            attr: () => self, css: () => self, on: () => self, off: () => self,
            click: () => self, change: () => self, trigger: () => self,
            keyup: () => self, keydown: () => self, keypress: () => self,
            focus: () => self, blur: () => self, submit: () => self,
            find: () => self, children: () => self, parent: () => self, first: () => self,
            each: (fn) => { if (fn) fn.call(self, 0, self); return self; },
            length: 0
        };
        return self;
    },
    window: { onload: null, location: { search: '' }, File: true, FileReader: true },
    document: {
        getElementById: () => ({ innerHTML: '', addEventListener: () => {} }),
        querySelector: () => null,
        querySelectorAll: () => [],
        createElement: () => ({ style: {} })
    },
    File: true,
    FileReader: true,
    XMLSerializer: function() { return { serializeToString: () => '' }; },
};
context.$.QueryString = {};
context.$.ajax = () => Promise.resolve();
context.$.fn = {};
context.jQuery = context.$;
vm.createContext(context);

const basePath = path.join(__dirname, '../../stardew-predictor');

// Load dependencies
vm.runInContext(fs.readFileSync(path.join(basePath, 'xxhash.min.js'), 'utf8'), context);
vm.runInContext(fs.readFileSync(path.join(basePath, 'cs-random.js'), 'utf8'), context);

// Load stardew-predictor
let predictorCode = fs.readFileSync(path.join(basePath, 'stardew-predictor.js'), 'utf8');

const exportCode = `
window.__stardew_exports = {
    save: save,
    parseSummary: parseSummary,
};
`;
predictorCode = predictorCode.replace(/\n};\n$/, exportCode + '\n};\n');
vm.runInContext(predictorCode, context);

// Initialize
if (context.window.onload) {
    context.window.onload();
}

const stardew = context.window.__stardew_exports;
stardew.parseSummary(undefined);  // Initialize embedded data

// Extract objects in iteration order
// IMPORTANT: rng.Next() is called for EVERY object, even ones with invalid IDs
// So we must include ALL objects to maintain correct RNG consumption
const objects = [];
for (const key in stardew.save.objects) {
    const obj = stardew.save.objects[key];
    const id = parseInt(obj.id);

    // Store with id=-1 for NaN IDs - these still consume RNG!
    objects.push({
        id: isNaN(id) ? -1 : id,
        name: obj.name,
        type: obj.type || 'Basic',
        category: obj.category !== undefined ? obj.category : 0,
        price: obj.price || 0,
        offlimits: !!obj.offlimits,
        type_excluded: obj.type === 'Arch' || obj.type === 'Minerals' || obj.type === 'Quest'
    });
}

console.log(`Found ${objects.length} objects in save.objects`);

// Verify first few
console.log('First 10 objects:');
for (let i = 0; i < 10 && i < objects.length; i++) {
    console.log(`  ${objects[i].id}: ${objects[i].name} (price=${objects[i].price}, cat=${objects[i].category})`);
}

// Generate Rust code
let rust = `/// Object data for 1.6 cart algorithm
/// Generated from stardew-predictor save.objects at runtime (${new Date().toISOString()})
/// IMPORTANT: This array is in the EXACT iteration order of save.objects
/// because the shuffle algorithm calls rng.Next() for every object.
/// Total objects: ${objects.length}
/// (id, price, offlimits, category, type_excluded)
/// type_excluded = type is 'Arch', 'Minerals', or 'Quest'

pub const CART_OBJECTS_1_6: &[(i32, i32, bool, i32, bool)] = &[
`;

for (const obj of objects) {
    rust += `    (${obj.id}, ${obj.price}, ${obj.offlimits}, ${obj.category}, ${obj.type_excluded}),\n`;
}

rust += `];
`;

// Write output
const outPath = path.join(__dirname, '../src/mechanics/cart_objects_1_6.rs');
fs.writeFileSync(outPath, rust);
console.log(`\nWrote ${objects.length} objects to ${outPath}`);

// Verify counts
const inRange = objects.filter(o => o.id >= 2 && o.id <= 789).length;
console.log(`Objects in range 2-789: ${inRange}`);

// Verify by checking a specific expected item
const sashimi = objects.find(o => o.name === 'Sashimi');
if (sashimi) {
    console.log(`Verified: Sashimi found at ID ${sashimi.id}, price ${sashimi.price}`);
}

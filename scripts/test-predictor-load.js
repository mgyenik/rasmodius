#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const vm = require('vm');

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
            find: () => self, children: () => self, parent: () => self,
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
context.jQuery = context.$;  // jQuery alias
vm.createContext(context);

const basePath = path.join(__dirname, '../../stardew-predictor');

// Load dependencies
vm.runInContext(fs.readFileSync(path.join(basePath, 'xxhash.min.js'), 'utf8'), context);
vm.runInContext(fs.readFileSync(path.join(basePath, 'cs-random.js'), 'utf8'), context);

// Load and modify stardew-predictor to export internal functions
let predictorCode = fs.readFileSync(path.join(basePath, 'stardew-predictor.js'), 'utf8');

// Find the end of window.onload and inject exports before it
// The function ends with "};" at line 9244
const exportCode = `
// Injected exports for golden test generation
window.__stardew_exports = {
    save: save,
    compareSemVer: compareSemVer,
    getRandomSeed: getRandomSeed,
    getHashFromArray: getHashFromArray,
    getHashFromString: getHashFromString,
    getCartItem: getCartItem,
    getRandomItems: getRandomItems,
    parseSummary: parseSummary,
};
`;

// Insert before the final "};" of window.onload
predictorCode = predictorCode.replace(/\n};\n$/, exportCode + '\n};\n');
vm.runInContext(predictorCode, context);

console.log('Before onload:');
console.log('  save exists:', 'save' in context);

if (context.window.onload) {
    console.log('Calling window.onload...');
    context.window.onload();
}

// Call parseSummary to initialize data (with undefined to skip XML parsing)
const { parseSummary } = context.window.__stardew_exports || {};
if (parseSummary) {
    console.log('\nCalling parseSummary(undefined) to initialize data...');
    parseSummary(undefined);
}

console.log('\nAfter onload:');
console.log('  __stardew_exports exists:', '__stardew_exports' in context.window);

const stardewExports = context.window.__stardew_exports;
if (stardewExports) {
    console.log('  save.objects:', Object.keys(stardewExports.save?.objects || {}).length);
    console.log('  save.cartItems:', Object.keys(stardewExports.save?.cartItems || {}).length);
    console.log('  save.cartItems_1_4:', Object.keys(stardewExports.save?.cartItems_1_4 || {}).length);
    console.log('  getCartItem:', typeof stardewExports.getCartItem);
    console.log('  getRandomItems:', typeof stardewExports.getRandomItems);
    console.log('  compareSemVer:', typeof stardewExports.compareSemVer);
} else {
    console.log('  No exports found!');
}

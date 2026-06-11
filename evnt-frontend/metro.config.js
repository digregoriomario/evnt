// Polyfill for Node 18 missing Array.prototype.toReversed
if (!Array.prototype.toReversed) {
  Object.defineProperty(Array.prototype, 'toReversed', {
    value: function() {
      return [...this].reverse();
    },
    enumerable: false,
    configurable: true,
    writable: true
  });
}

const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

module.exports = config;

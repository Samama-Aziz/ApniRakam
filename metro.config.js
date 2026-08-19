// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Allow metro to resolve .wasm files (required by expo-sqlite on web)
config.resolver.assetExts.push('wasm');

// Ensure wasm is not treated as a source extension
config.resolver.sourceExts = config.resolver.sourceExts.filter(
  (ext) => ext !== 'wasm'
);

module.exports = config;

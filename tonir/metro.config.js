const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// OneDrive locks files during sync, corrupting Metro's parallel file-map workers.
// Single worker avoids the race condition.
config.maxWorkers = 1;

module.exports = config;

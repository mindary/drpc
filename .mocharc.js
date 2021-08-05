const {mergeMochaConfigs} = require('@loopback/build');
const defaultConfig = require('@loopback/build/config/.mocharc.json');

const MONOREPO_CONFIG = {
  // reporter: 'spec',
};

module.exports = mergeMochaConfigs(defaultConfig, MONOREPO_CONFIG);

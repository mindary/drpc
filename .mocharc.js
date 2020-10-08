const {mergeMochaConfigs} = require('@tib/build');
const defaultConfig = require('@tib/build/config/.mocharc.json');

const MONOREPO_CONFIG = {
  parallel: true,
  // reporter: 'spec',
};

module.exports = mergeMochaConfigs(defaultConfig, MONOREPO_CONFIG);

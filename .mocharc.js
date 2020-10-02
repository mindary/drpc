const {mergeMochaConfigs} = require('@tib/build');
const defaultConfig = require('@tib/build/config/.mocharc.json');

const MONOREPO_CONFIG = {
  parallel: true,
};

module.exports = mergeMochaConfigs(defaultConfig, MONOREPO_CONFIG);

'use strict';

const UglifyJsPlugin = require('uglifyjs-webpack-plugin');

module.exports = {
  target: 'web',
  entry: {
    remly: './lib/index.js',
  },
  output: {
    library: 'remly',
    libraryTarget: 'umd',
    path: __dirname,
    filename: '[name].js',
  },
  resolve: {
    modules: ['node_modules'],
    extensions: ['-browser.js', '.js', '.json'],
  },
  plugins: [
    // new UglifyJsPlugin()
  ],
};

export * from './worker';

if (require.main === module) {
  require('./cli');
}

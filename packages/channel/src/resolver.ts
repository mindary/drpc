import debugFactory from 'debug';
import * as util from 'util';

const debug = debugFactory('remly:datasource');

export type Loader = (name: string) => any;

export function resolveServerChannel(name: string, loader?: Loader) {
  const names = channelModuleNames(name);
  const channel = tryModules(names, loader);
  let error = null;
  if (!channel) {
    error = util.format(
      '\nWARNING: {{Remly}} server channel "%s" is not installed ' +
        'as any of the following modules:\n\n %s\n\nTo fix, run:\n\n    {{npm install %s --save}}\n',
      name,
      names.join('\n'),
      names[names.length - 1],
    );
  }
  return {
    channel: channel?.default ?? channel,
    error: error,
  };
}

// List possible channel module names
function channelModuleNames(name: string) {
  const names = []; // Check the name as is
  if (!name.match(/^\//)) {
    names.push('./channels/' + name); // Check built-in channels
    if (name.indexOf('remly-channel-') !== 0) {
      names.push('remly-channel-' + name); // Try remly-channel-<name>
    }
    if (name.indexOf('@remly/channel-') !== 0) {
      names.push('@remly/channel-' + name); // Try @remly/channel-<name>
    }
    if (name.indexOf('@remly/') !== 0) {
      names.push('@remly/' + name); // Try @remly/<name>
    }
  }
  // Only try the short name if the channel is not from Remly
  if (['tcp', 'ws', 'thread'].indexOf(name) === -1) {
    names.push(name);
  }
  return names;
}

// testable with DI
function tryModules(names: string[], loader?: Loader) {
  let mod;
  loader = loader || require;
  for (const item of names) {
    try {
      mod = loader(item);
    } catch (e) {
      const notFound = e.code === 'MODULE_NOT_FOUND' && e.message && e.message.indexOf(item) > 0;

      if (notFound) {
        debug('Module %s not found, will try another candidate.', item);
        continue;
      }

      debug('Cannot load channel %s: %s', item, e.stack || e);
      throw e;
    }
    if (mod) {
      break;
    }
  }
  return mod;
}

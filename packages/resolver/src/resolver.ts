import debugFactory from 'debug';

const debug = debugFactory('drpc:resolver');

export type Loader = (name: string) => any;

export function resolveModule(name: string, loader?: Loader) {
  const names = channelModuleNames(name);
  const module = tryModules(names, loader);
  let error = null;
  if (!module) {
    error = `WARNING: {{DRPC}} server channel "${name}" is not installed  as any of the following modules:\n\n ${names.join(
      '\n',
    )}\n\nTo fix, run:\n\n    {{npm install ${names[names.length - 1]}} --save}}\n`;
  }
  return {
    module: module?.default ?? module,
    error: error,
  };
}

// List possible channel module names
function channelModuleNames(name: string) {
  const names = []; // Check the name as is
  if (!name.match(/^[\/.@]/) && !name.startsWith('@')) {
    names.push('./channels/' + name); // Check built-in channels
    if (name.indexOf('drpc-') !== 0) {
      names.push('drpc-' + name); // Try drpc-channel-<name>
    }
    names.push('@drpc/' + name); // Try @drpc/channel-<name>
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
    } catch (e: any) {
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

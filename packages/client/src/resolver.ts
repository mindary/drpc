import debugFactory from 'debug';

const debug = debugFactory('drpc:client:resolver');

export type Loader = (name: string) => any | Promise<any>;

export async function resolve(name: string, loader?: Loader) {
  const names = channelModuleNames(name);
  const module = await tryModules(names, loader);
  let error = null;
  if (!module) {
    error = `WARNING: DRPC connector "${name}" is not installed  as any of the following connectors:\n\n ${names.join(
      '\n',
    )}\n\nTo fix, run:\n\n    npm install ${names[names.length - 1]} --save\n`;
  }
  return {
    module: module?.default ?? module,
    error: error,
  };
}

// List possible connector module names
function channelModuleNames(name: string) {
  const names = []; // Check the name as is
  if (!name.match(/^[\/.@]/) && !name.startsWith('drpc-connector-')) {
    names.push('./connectors/' + name); // Check built-in channels
    names.push('drpc-connector-' + name); // Try drpc-connector-<name>
    names.push('@drpc/connector-' + name); // Try @drpc/connector-<name>
  } else {
    names.push(name);
  }

  return names;
}

// testable with DI
async function tryModules(names: string[], loader?: Loader) {
  let mod;
  loader = loader ?? (async name => import(name));
  for (const item of names) {
    try {
      mod = await loader(item);
    } catch (e: any) {
      const notFound = e.code === 'MODULE_NOT_FOUND' && e.message && e.message.indexOf(item) > 0;

      if (notFound) {
        debug('Module %s not found, will try another candidate.', item);
        continue;
      }

      debug('Cannot load connector %s: %s', item, e.stack || e);
      throw e;
    }
    if (mod) {
      break;
    }
  }
  return mod;
}

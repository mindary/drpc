import assert from 'assert';
import {Request} from '@drpc/core';
import debugFactory from 'debug';
import {DecoratorFactory} from '@loopback/metadata';
import {describeInjectedArguments} from './inject';
import {DrpcParameterMetadata} from '@drpc/decorators';

const debug = debugFactory('drpc:registry:resolver');

/**
 * Given a function with arguments decorated with `@inject`,
 * return the list of arguments resolved using the values
 * bound in `ctx`.

 * The function returns an argument array when all dependencies were
 * resolved synchronously, or a Promise otherwise.
 *
 * @param target - The class for constructor injection or prototype for method
 * injection
 * @param method - The method name. If set to '', the constructor will
 * be used.
 * @param request - The calling request
 * @param nonInjectedArgs - Optional array of args for non-injected parameters
 */
export function resolveInjectedArguments(
  target: object,
  method: string,
  request: Request<any>,
  nonInjectedArgs?: any[],
): any[] {
  /* istanbul ignore if */
  if (debug.enabled) {
    debug('Resolving injected arguments for %s', DecoratorFactory.getTargetName(target, method));
  }
  const targetWithMethods = <{[method: string]: Function}>target;
  if (method) {
    assert(typeof targetWithMethods[method] === 'function', `Method ${method} not found`);
  }
  // NOTE: the array may be sparse, i.e.
  //   Object.keys(injectedArgs).length !== injectedArgs.length
  // Example value:
  //   [ , 'key1', , 'key2']
  const injectedArgs = describeInjectedArguments(target, method);
  const extraArgs = nonInjectedArgs ?? [];

  let argLength = DecoratorFactory.getNumberOfParameters(target, method);

  // Please note `injectedArgs` contains `undefined` for non-injected args
  const numberOfInjected = injectedArgs.filter(i => i != null).length;
  if (argLength < numberOfInjected + extraArgs.length) {
    /**
     * `Function.prototype.length` excludes the rest parameter and only includes
     * parameters before the first one with a default value. For example,
     * `hello(@inject('name') name: string = 'John')` gives 0 for argLength
     */
    argLength = numberOfInjected + extraArgs.length;
  }

  let nonInjectedIndex = 0;

  return resolveList(new Array(argLength), (val, i) => {
    // The `val` argument is not used as the resolver only uses `injectedArgs`
    // and `extraArgs` to return the new value
    const injection = i < injectedArgs.length ? injectedArgs[i] : undefined;
    if (injection == null) {
      if (nonInjectedIndex < extraArgs.length) {
        // Set the argument from the non-injected list
        return extraArgs[nonInjectedIndex++];
      } else {
        const name = DecoratorFactory.getTargetName(target, method, i);
        throw new Error(
          `The argument '${name}' is not decorated for dependency injection ` +
            'but no value was supplied by the caller. Did you forget to apply ' +
            '@drpc.params() to the argument?',
        );
      }
    }
    return resolve(injection, request);
  });
}

export function resolveList<T, V>(list: T[], resolver: (val: T, index: number, values: T[]) => V): V[] {
  const result: V[] = new Array<V>(list.length);
  for (let ix = 0; ix < list.length; ix++) {
    result[ix] = resolver(list[ix], ix, list);
  }
  return result;
}

function resolve(injection: DrpcParameterMetadata, request: Request<any>) {
  if (injection.selector === 'req' || injection.selector === 'request') {
    return request;
  } else if (injection.selector === 'res' || injection.selector === 'response') {
    return request.response;
  } else if (injection.selector === 'message') {
    return request.message;
  } else {
    throw new Error(`Unresolved injection: ${injection.selector}`);
  }
}

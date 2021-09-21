import {DRPC_INJECT_METHOD_KEY, DRPC_INJECT_PARAMETERS_KEY, DrpcParameterMetadata} from '@drpc/decorators';
import {InspectionOptions, MetadataInspector, MetadataMap} from '@loopback/metadata';

/**
 * Return an array of injection objects for parameters
 * @param target - The target class for constructor or static methods,
 * or the prototype for instance methods
 * @param method - Method name, undefined for constructor
 */
export function describeInjectedArguments(target: Object, method?: string): Readonly<DrpcParameterMetadata>[] {
  method = method ?? '';

  // Try to read from cache
  const cache =
    MetadataInspector.getAllMethodMetadata<Readonly<DrpcParameterMetadata>[]>(DRPC_INJECT_METHOD_KEY, target, {
      ownMetadataOnly: true,
    }) ?? {};
  let meta: Readonly<DrpcParameterMetadata>[] = cache[method];
  if (meta) return meta;

  // Build the description
  const options: InspectionOptions = {};
  if (method === '') {
    // if (shouldSkipBaseConstructorInjection(target)) {
    options.ownMetadataOnly = true;
    // }
  } else if (Object.prototype.hasOwnProperty.call(target, method)) {
    // The method exists in the target, no injections on the super method
    // should be honored
    options.ownMetadataOnly = true;
  }
  meta =
    MetadataInspector.getAllParameterMetadata<Readonly<DrpcParameterMetadata>>(
      DRPC_INJECT_PARAMETERS_KEY,
      target,
      method,
      options,
    ) ?? [];

  // Cache the result
  cache[method] = meta;
  MetadataInspector.defineMetadata<MetadataMap<Readonly<DrpcParameterMetadata>[]>>(
    DRPC_INJECT_METHOD_KEY,
    cache,
    target,
  );
  return meta;
}

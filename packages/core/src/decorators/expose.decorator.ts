import {MetadataInspector, MetadataMap, MethodDecoratorFactory} from '@loopback/metadata';
import {Constructor} from '@remly/types';
import {ExposeMetadata} from '../types';
import {EXPOSE_METADATA_LEY} from '../keys';

export function expose(metadata?: ExposeMetadata | string) {
  if (typeof metadata === 'string') {
    metadata = {alias: metadata};
  }
  metadata = metadata ?? {};
  return MethodDecoratorFactory.createDecorator<ExposeMetadata>(EXPOSE_METADATA_LEY, metadata);
}

/**
 * Fetch expose method metadata stored by `@expose` decorator.
 *
 * @param serviceClass - Target service
 * @param methodName - Target method
 */
export function getExposeMetadata(serviceClass: Constructor<{}>, methodName: string): ExposeMetadata {
  return (
    MetadataInspector.getMethodMetadata<ExposeMetadata>(EXPOSE_METADATA_LEY, serviceClass.prototype, methodName) ?? {}
  );
}

/**
 * Fetch all expose method metadata stored by `@expose` decorator.
 *
 * @param serviceClass - Target service
 */
export function getAllExposeMetadata(serviceClass: Constructor<{}>): MetadataMap<ExposeMetadata> | undefined {
  return MetadataInspector.getAllMethodMetadata<ExposeMetadata>(EXPOSE_METADATA_LEY, serviceClass.prototype);
}

export const isBrowser = typeof navigator === 'object';

export function hasOwn<T = any>(target: T, key: string): boolean {
  return typeof target === 'object' && Object.prototype.hasOwnProperty.call(target, key);
}

import {Raw} from './types';

export const MAX_SAFE_INTEGER = 9007199254740991;

export function isLength(value: any): boolean {
  return typeof value == 'number' && value > -1 && value % 1 === 0 && value <= MAX_SAFE_INTEGER;
}

export function isArrayLike(value: any): value is ArrayLike<any> {
  return value != null && typeof value !== 'function' && isLength(value.length);
}

export function rawLength(raw?: Raw) {
  if (raw == null) {
    return 0;
  }
  if (isArrayLike(raw)) {
    return raw.length;
  }
  return raw.byteLength;
}

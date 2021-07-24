import {AsyncOrSync, noop} from 'ts-essentials';
import {Raw} from '@remly/serializer';

export const MAX_SAFE_INTEGER = 9007199254740991;

export type AnyFunction = (...args: any[]) => any;

/**
 * Create a 64 bit nonce.
 * @returns {Buffer}
 */
export function nonce() {
  const n = new Buffer(8);
  const a = (Math.random() * 0x100000000) >>> 0;
  const b = (Math.random() * 0x100000000) >>> 0;

  n.writeUInt32LE(a, 0);
  n.writeUInt32LE(b, 4);

  return n;
}

export function isPromiseLike(x: any): x is PromiseLike<any> {
  return x && typeof x.then === 'function';
}

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

export type SyncOnError = Function | {emit: Function};

export function sync<F extends AnyFunction>(fn: (...args: Parameters<F>) => AsyncOrSync<void>, onerror?: SyncOnError) {
  function error(err: any) {
    if (onerror) {
      if (typeof (onerror as any).emit === 'function') {
        (onerror as any).emit('error', err);
      } else if (typeof onerror === 'function') {
        onerror(err);
      }
    } else {
      console.error(err);
    }
  }

  return (...args: Parameters<F>): void => {
    try {
      const result = fn(...args);
      if (isPromiseLike(result)) {
        result.then(noop, error);
      }
    } catch (e) {
      error(e);
    }
  };
}

/**
 * Sync EventListener
 * @param fn
 * @param onerror
 */
// export function syncl(fn: () => AsyncOrSync<void>, onerror?: SyncOnError): () => void;
// export function syncl<P1 = any>(fn: (p1: P1) => AsyncOrSync<void>, onerror?: SyncOnError): (p1: P1) => void;
// export function syncl<P = any>(
//   fn: (...args: P[]) => AsyncOrSync<void>,
//   onerror?: Function | {emit: Function},
// ): (...args: P[]) => void {
//   return sync<(...args: P[]) => void>(fn, onerror);
// }

function isObject(o: any) {
  return Object.prototype.toString.call(o) === '[object Object]';
}

export function isPlainObject(o: any) {
  if (isObject(o) === false) return false;

  // If has modified constructor
  const ctor = o.constructor;
  if (ctor === undefined) return true;

  // If has modified prototype
  const proto = ctor.prototype;
  if (isObject(proto) === false) return false;

  // If constructor does not have an Object-specific method
  if (Object.prototype.hasOwnProperty.call(proto, 'isPrototypeOf') === false) {
    return false;
  }

  // Most likely a plain Object
  return true;
}

export function protoKeys(o: any) {
  return Object.getOwnPropertyNames(Object.getPrototypeOf(o)).filter(key => key !== 'constructor');
}

export async function readBinary(data: Buffer | ArrayBuffer | Blob | string): Promise<Buffer> {
  if (!data || typeof data !== 'object') {
    throw new Error('Bad data object');
  }

  if (Buffer.isBuffer(data)) {
    return data;
  }

  if (data instanceof ArrayBuffer) {
    return Buffer.from(data);
  }

  if (typeof data === 'string') {
    return Buffer.from(data);
  }

  if (isArrayLike(data)) {
    return Buffer.from(data as any);
  }

  if (typeof Blob !== 'undefined' && Blob) {
    if (data instanceof Blob) {
      return new Promise<Buffer>(resolve => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(Buffer.from((reader.result ? reader.result : '') as any));
        reader.readAsArrayBuffer(data);
      });
    }
  }

  throw new Error('Bad data object');
}

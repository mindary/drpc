export const MAX_SAFE_INTEGER = 9007199254740991;

/**
 * Create a n byte nonce.
 * @returns {Buffer}
 */
export function random(n = 8) {
  const answer = Buffer.allocUnsafe(n);
  for (let i = 0; i < n; i += 4) {
    const num = (Math.random() * 0x100000000) >>> 0;
    const end = Math.min(n, i + 4);
    for (let j = i; j < end; j++) {
      answer[j] = (num >> ((j - i) << 3)) & 0xff;
    }
  }
  return answer;
}

export function isLength(value: any): boolean {
  return typeof value == 'number' && value > -1 && value % 1 === 0 && value <= MAX_SAFE_INTEGER;
}

export function isArrayLike(value: any): value is ArrayLike<any> {
  return value != null && typeof value !== 'function' && isLength(value.length);
}

export function rawLength(raw?: ArrayLike<number> | ArrayBuffer) {
  if (raw == null) {
    return 0;
  }
  if (isArrayLike(raw)) {
    return raw.length;
  }
  return raw.byteLength;
}

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

export function nextTick(fn: (...args: any[]) => void) {
  return process?.nextTick ? process.nextTick(fn) : setImmediate(fn);
}

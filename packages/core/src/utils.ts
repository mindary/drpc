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

export function protoKeys(o: any) {
  return Object.getOwnPropertyNames(Object.getPrototypeOf(o)).filter(key => key !== 'constructor');
}

export function nextTick(fn: (...args: any[]) => void) {
  return process?.nextTick ? process.nextTick(fn) : setImmediate(fn);
}

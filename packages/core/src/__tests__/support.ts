import {AsyncOrSync} from 'ts-essentials';

export async function peace<T>(fn: (...args: any[]) => AsyncOrSync<T>): Promise<[T, any]> {
  let result, err;
  try {
    result = await fn();
  } catch (e) {
    err = e;
  }
  return [<T>result, err];
}

export function peaceSync<T>(fn: (...args: any[]) => T): [T, any] {
  let result, err;
  try {
    result = fn();
  } catch (e) {
    err = e;
  }
  return [<T>result, err];
}

export function createNoop() {
  return (...args: unknown[]) => {};
}

export type Constructor<T> = new (...args: any[]) => T;

export type ValueOrPromise<T> = T | PromiseLike<T>;

export type ReverseMap<T extends Record<keyof T, keyof any>> = {
  [P in T[keyof T]]: {
    [K in keyof T]: T[K] extends P ? K : never;
  }[keyof T];
};

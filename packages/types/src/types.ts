export type Constructor<T> = new (...args: any[]) => T;

export type ValueOrPromise<T> = T | PromiseLike<T>;

export type ReverseMap<T extends Record<keyof T, keyof any>> = {
  [P in T[keyof T]]: {
    [K in keyof T]: T[K] extends P ? K : never;
  }[keyof T];
};

// Generic type utils
export type ValueType<T> = T extends PromiseLike<infer U> ? U : T extends ValueOrPromise<infer U> ? U : T;
export type ReturnTypeOfMethod<T> = T extends (...args: Array<any>) => any ? ReturnType<T> : any;
export type ReturnTypeOfMethodIfExists<T, S> = S extends keyof T ? ReturnTypeOfMethod<T[S]> : any;
export type ReplaceReturnType<T extends (...a: any) => any, TNewReturn> = (...a: Parameters<T>) => TNewReturn;

export type ServiceMethods = {[name: string]: any};
export type RemoteMethods<T extends ServiceMethods> = {
  [K in keyof T]: ReplaceReturnType<T[K], Promise<ValueType<ReturnTypeOfMethodIfExists<T, K>>>>;
};

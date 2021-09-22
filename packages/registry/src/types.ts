import {ServiceMethods} from '@drpc/types';

export type UntypeParameters<T extends (...args: any[]) => any> = (...args: any[]) => ReturnType<T>;

export type UntypeParametersForService<T extends ServiceMethods> = {
  [K in keyof T]: UntypeParameters<T[K]>;
};

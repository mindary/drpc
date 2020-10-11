import {AsyncOrSyncType} from 'ts-essentials';
import {Connection} from './connection';

export type Service = {
  [p: string]: (...args: any[]) => any;
};

export class TypedService<S extends Service = Service> {
  constructor(protected readonly connection: Connection<any, any>, protected readonly namespace?: string) {}

  call<K extends keyof S>(
    method: K,
    params?: Parameters<S[K]>,
    timeout?: number,
  ): Promise<AsyncOrSyncType<ReturnType<S[K]>>> {
    const full = this.namespace ? `${this.namespace}.${method}` : <string>method;
    return <Promise<any>>this.connection.call(full, params, timeout);
  }
}

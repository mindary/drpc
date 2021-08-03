import {ValueOrPromise} from '@remly/types';

export type Handler = (...args: any[]) => any;

export class Method {
  constructor(public handler: Handler, public scope?: any) {}

  invoke(params: any): Promise<any> {
    if (params == null) {
      params = [];
    } else if (!Array.isArray(params)) {
      params = [params];
    }
    return this.handler.call(this.scope, ...params);
  }
}

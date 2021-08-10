import {Server} from '@remly/server';

export class BaseServer extends Server {
  constructor(options?: any) {
    super(options);
  }

  get address() {
    return undefined;
  }

  start() {
    return undefined;
  }

  stop() {
    return undefined;
  }
}

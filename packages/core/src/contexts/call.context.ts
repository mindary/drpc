import {RemoteError} from '../errors';
import {Socket} from '../sockets';
import {Context} from './context';
import {CallRequest} from '../types';

export class CallContext<SOCKET extends Socket = Socket> extends Context<SOCKET> {
  #result: any;

  constructor(socket: SOCKET, public readonly request: CallRequest) {
    super(socket);
  }

  get id() {
    return this.request.id;
  }

  get name() {
    return this.request.name;
  }

  get params() {
    return this.request.params;
  }

  get result() {
    return this.#result;
  }

  set result(result: any) {
    this.#result = result;
  }

  async end(payload?: any) {
    if (this.id) {
      // send ack back for "call"
      await this.sendAndEnd('ack', {id: this.id!, payload});
    }
    // ignore for "signal"
  }

  protected async doError(err: RemoteError): Promise<void> {
    await this.sendAndEnd('error', {id: this.id ?? 0, ...err});
  }
}

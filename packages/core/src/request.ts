import {Emittery} from '@libit/emittery';
import {Socket} from './sockets';
import {PacketTypeKeyType} from './packet-types';
import {PacketMessages} from './messages';
import {makeRemoteError, RemoteError} from './errors';
import {RequestInfo} from './types';

export interface ContextEvents {
  ended: undefined;
  finished: undefined;
}

const EMPTY_REQUEST_MESSAGE: RequestInfo = {
  id: 0,
  name: '',
  args: undefined,
};

export class Request<SOCKET extends Socket = any> extends Emittery<ContextEvents> {
  readonly info: RequestInfo;

  #ended: boolean;
  #finished: boolean;
  #result: any;

  constructor(public readonly socket: SOCKET, info?: RequestInfo) {
    super();
    this.info = info ?? EMPTY_REQUEST_MESSAGE;
  }

  get ended() {
    return this.#ended;
  }

  get finished() {
    return this.#finished;
  }

  get sid() {
    return this.socket.id;
  }

  get address() {
    return this.socket.address;
  }

  get id(): number | undefined {
    return this.info.id;
  }

  get name() {
    return this.info.name;
  }

  get args() {
    return this.info.args;
  }

  get result() {
    return this.#result;
  }

  set result(result: any) {
    this.#result = result;
  }

  hasId() {
    return this.id != null && this.id > 0;
  }

  hasName() {
    return !!this.name;
  }

  isConnect() {
    return !this.hasId() && !this.hasName();
  }

  isCall() {
    return this.hasId() && this.hasName();
  }

  isSignal() {
    return !this.hasId() && this.hasName();
  }

  async end(payload?: any) {
    if (this.isConnect()) {
      return this.sendAndEnd('connect', {payload});
    }

    if (this.isCall()) {
      return this.sendAndEnd('ack', {id: this.id!, payload});
    }
  }

  async error(err?: any) {
    if (err == null) {
      return;
    }
    const isNativeError = Object.prototype.toString.call(err) === '[object Error]' || err instanceof Error;
    if (!isNativeError) throw new TypeError('non-error thrown: ' + err.toJSON());
    await this.doError(makeRemoteError(err));
  }

  protected doError(err: RemoteError): Promise<void> {
    return this.sendAndEnd('error', {id: this.id ?? 0, ...err});
  }

  protected async sendAndEnd<T extends PacketTypeKeyType>(type: T, message: PacketMessages[T]) {
    if (this.#ended) {
      throw new Error('socket is ended');
    }
    this.#ended = true;
    await this.emit('ended');
    await this.send(type, message);
    this.#finished = true;
    await this.emit('finished');
  }

  private async send<T extends PacketTypeKeyType>(type: T, message: PacketMessages[T]) {
    await this.socket.send(type, message);
  }
}

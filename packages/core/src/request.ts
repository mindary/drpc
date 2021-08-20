import {Emittery} from '@libit/emittery';
import {ChainedError} from '@libit/error/chained';
import {Socket} from './sockets';
import {makeRemoteError} from './errors';
import {PacketTypeKeyType} from './packet-types';
import {PacketMessages} from './messages';

export interface ContextEvents {
  ended: undefined;
  finished: undefined;
}

export interface RequestContent {
  id?: number;
  name: string;
  params?: any;
}

const EMPTY_REQUEST_MESSAGE: RequestContent = {
  id: 0,
  name: '',
  params: undefined,
};

export abstract class Request<SOCKET extends Socket = any> extends Emittery<ContextEvents> {
  readonly content: RequestContent;

  protected _ended: boolean;
  protected _finished: boolean;

  constructor(public readonly socket: SOCKET, content?: RequestContent) {
    super();
    this.content = content ?? EMPTY_REQUEST_MESSAGE;
  }

  get ended() {
    return this._ended;
  }

  get finished() {
    return this._finished;
  }

  get sid() {
    return this.socket.id;
  }

  get address() {
    return this.socket.address;
  }

  get id(): number | undefined {
    return this.content.id;
  }

  get name() {
    return this.content.name;
  }

  set name(name) {
    this.content.name = name;
  }

  get params() {
    return this.content.params;
  }

  set params(params: any) {
    this.content.params = params;
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

  abstract end(payload?: any): Promise<any>;

  abstract error(err?: any): Promise<any>;
}

export class IncomingRequest<SOCKET extends Socket = any> extends Request<SOCKET> {
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
    return this.sendAndEnd('error', {id: this.id ?? 0, ...makeRemoteError(err)});
  }

  protected async sendAndEnd<T extends PacketTypeKeyType>(type: T, message: PacketMessages[T]) {
    if (this._ended) {
      throw new Error('socket is ended');
    }
    this._ended = true;
    await this.emit('ended');
    await this.send(type, message);
    this._finished = true;
    await this.emit('finished');
  }

  private async send<T extends PacketTypeKeyType>(type: T, message: PacketMessages[T]) {
    await this.socket.send(type, message);
  }
}

export class OutgoingRequest<SOCKET extends Socket = any> extends Request<SOCKET> {
  async end(payload?: any): Promise<any> {
    if (this._ended) return;
    this._ended = true;
    await this.emit('ended');
    this._finished = true;
    await this.emit('finished');
  }

  error(err: any): Promise<any> {
    throw new ChainedError(err);
  }
}

import {Emittery} from '@libit/emittery';
import {MessageTypes, Metadata, MetadataValue, PacketType} from '@drpc/packet';
import {Socket} from './sockets';
import {Request, RequestPacketType} from './request';
import {makeRemoteError} from './errors';
import {assert} from 'ts-essentials';

export type ResponseType<REQ> = REQ extends 'connect'
  ? 'connack' | 'auth'
  : REQ extends 'auth'
  ? 'auth' | 'connack'
  : REQ extends 'call'
  ? 'ack'
  : never;

export interface ResponseEvents {
  ended: undefined;
  finished: undefined;
}

export class Response<REQ extends RequestPacketType, SOCKET extends Socket = any> extends Emittery<ResponseEvents> {
  request: Request<REQ>;

  public readonly metadata: Metadata;

  protected constructor(public readonly socket: SOCKET, public readonly id?: number) {
    super();
    this.metadata = new Metadata();
  }

  protected _ended: boolean;

  get ended() {
    return this._ended;
  }

  protected _finished: boolean;

  get finished() {
    return this._finished;
  }

  get(key: string): MetadataValue[] {
    return this.metadata.get(key);
  }

  getMap(): {[key: string]: MetadataValue} {
    return this.metadata.getMap();
  }

  set(key: string, value: MetadataValue): void {
    this.metadata.set(key, value);
  }

  add(key: string, value: MetadataValue): void {
    this.metadata.add(key, value);
  }

  remove(key: string): void {
    this.metadata.remove(key);
  }

  async endIfNotEnded<T extends ResponseType<REQ>>(type: T, message?: Omit<MessageTypes[T], 'id'>) {
    if (!this._ended) {
      return this.end(type, message);
    }
  }

  async end<T extends ResponseType<REQ>>(type: T, message?: Omit<MessageTypes[T], 'id'>) {
    const data: any = message ? {...message} : {};
    if (this.id != null) {
      data.id = this.id;
    }
    return this.sendAndEnd(type, data);
  }

  async error(err?: any) {
    if (err == null) {
      return;
    }
    const isNativeError = Object.prototype.toString.call(err) === '[object Error]' || err instanceof Error;
    if (!isNativeError) throw new TypeError('non-error thrown: ' + err.toJSON());
    return this.sendAndEnd('error', {id: this.id ?? 0, ...makeRemoteError(err)});
  }

  protected async sendAndEnd<K extends PacketType>(type: K, message: MessageTypes[K]) {
    if (this._ended) {
      throw new Error('socket is ended');
    }
    this._ended = true;
    await this.emit('ended');
    await this.send(type, message);
    this._finished = true;
    await this.emit('finished');
  }

  private async send<K extends PacketType>(type: K, message: MessageTypes[K]) {
    await this.socket.send(type, message, this.metadata);
  }
}

export class ConnectResponse<SOCKET extends Socket = any> extends Response<'connect', SOCKET> {
  constructor(socket: SOCKET) {
    super(socket);
  }
}

export class AuthResponse<SOCKET extends Socket = any> extends Response<'auth', SOCKET> {
  constructor(socket: SOCKET) {
    super(socket);
  }
}

export class EventResponse<SOCKET extends Socket = any> extends Response<'event', SOCKET> {
  constructor(socket: SOCKET) {
    super(socket);
  }
}

export class CallResponse<SOCKET extends Socket = any> extends Response<'call', SOCKET> {
  constructor(socket: SOCKET, id: number) {
    super(socket, id);
  }
}

// export type ResponseClass<T extends RequestPacketType> = T extends 'connect'
//   ? ConnectResponse
//   : T extends 'auth'
//   ? AuthResponse
//   : T extends 'event'
//   ? EventResponse
//   : T extends 'call'
//   ? CallResponse
//   : never;

export function createResponse<T extends RequestPacketType, SOCKET extends Socket = any>(
  type: T,
  socket: SOCKET,
  id?: number,
): Response<T, SOCKET> {
  switch (type) {
    case 'connect':
      return new ConnectResponse(socket) as any;
    case 'auth':
      return new AuthResponse(socket) as any;
    case 'event':
      return new EventResponse(socket) as any;
    case 'call':
      assert(id, 'id is required for "call" request');
      return new CallResponse(socket, id) as any;
    default:
      throw new Error('Unsupported request: ' + type);
  }
}

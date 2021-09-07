import {Emittery} from '@libit/emittery';
import {MessageTypes, Metadata, MetadataValue, PacketType} from '@remly/packet';
import {Socket} from './sockets';
import {Request} from './request';
import {makeRemoteError} from './errors';

export interface ResponseEvents {
  ended: undefined;
  finished: undefined;
}

export class Response<SOCKET extends Socket = any> extends Emittery<ResponseEvents> {
  request: Request;

  public readonly metadata: Metadata;

  protected _ended: boolean;
  protected _finished: boolean;

  constructor(public readonly socket: SOCKET, public readonly type: PacketType, public readonly id?: number) {
    super();
    this.metadata = new Metadata();
  }

  get ended() {
    return this._ended;
  }

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

  async end(payload?: any) {
    if (this.type === 'connect') {
      return this.sendAndEnd('connack', {});
    }

    if (this.type === 'call') {
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

  protected async sendAndEnd<T extends PacketType>(type: T, message: MessageTypes[T]) {
    if (this._ended) {
      throw new Error('socket is ended');
    }
    this._ended = true;
    await this.emit('ended');
    await this.send(type, message);
    this._finished = true;
    await this.emit('finished');
  }

  private async send<T extends PacketType>(type: T, message: MessageTypes[T]) {
    await this.socket.send(type, message, this.metadata);
  }
}

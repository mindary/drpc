import {Emittery} from '@libit/emittery';
import {Socket} from '../sockets';
import {PacketTypeKeyType} from '../packet-types';
import {PacketMessages} from '../messages';
import {makeRemoteError, RemoteError} from '../errors';

export interface ContextEvents {
  ended: undefined;
  finished: undefined;
}

export abstract class Context<SOCKET extends Socket = Socket> extends Emittery<ContextEvents> {
  #ended: boolean;
  #finished: boolean;

  constructor(public readonly socket: SOCKET) {
    super();
  }

  get ended() {
    return this.#ended;
  }

  get finished() {
    return this.#finished;
  }

  async error(err?: any) {
    if (err == null) {
      return;
    }
    const isNativeError = Object.prototype.toString.call(err) === '[object Error]' || err instanceof Error;
    if (!isNativeError) throw new TypeError('non-error thrown: ' + err.toJSON());
    await this.doError(makeRemoteError(err));
  }

  protected abstract doError(err: RemoteError): Promise<void>;

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

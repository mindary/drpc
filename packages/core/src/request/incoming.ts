import {Socket} from '../sockets';
import {PacketTypeKeyType} from '../packet-types';
import {PacketMessages} from '../messages';
import {makeRemoteError} from '../errors';
import {Request} from './request';

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

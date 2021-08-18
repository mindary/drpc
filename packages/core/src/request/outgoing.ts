import {ChainedError} from '@libit/error/chained';
import {Socket} from '../sockets';
import {Request} from './request';

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

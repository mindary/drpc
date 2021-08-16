import {RemoteError, Socket} from '..';
import {Context} from './context';

export class ConnectContext<SOCKET extends Socket = Socket> extends Context<SOCKET> {
  async end(payload: any) {
    await this.sendAndEnd('connect', {payload});
  }

  protected async doError(err: RemoteError): Promise<void> {
    await this.sendAndEnd('error', {id: 0, ...err});
  }
}

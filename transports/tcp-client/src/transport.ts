import * as net from 'net';
import * as tls from 'tls';
import {NetAddress, Transport, TransportOptions} from '@remly/core';
import pick from 'tily/object/pick';

export class TCPTransport extends Transport {
  protected unbind: () => void;

  constructor(public readonly socket: net.Socket | tls.TLSSocket, options?: TransportOptions) {
    super(options);
    this.bind();
    if (socket.readable && socket.writable) {
      // readyState is 'open'
      this.open();
    }
  }

  get address(): NetAddress {
    return pick(['localAddress', 'localPort', 'remoteAddress', 'remotePort', 'remoteFamily'], this.socket);
  }

  protected bind() {
    const onopen = () => this.open();
    const ondata = (data: any) => this.onData(data);
    const onerror = (error: Error) => this.onError(error);
    const onclose = () => this.doClose('connection lost');

    this.socket.on('open', onopen);
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    this.socket.on('data', ondata);
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    this.socket.on('error', onerror);
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    this.socket.on('close', onclose);

    this.unbind = () => {
      this.socket.off('open', onopen);
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      this.socket.off('data', ondata);
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      this.socket.off('error', onerror);
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      this.socket.off('close', onclose);
    };
  }

  protected doSend(data: Buffer) {
    return this.socket.write(data);
  }

  protected async doClose(reason?: string | Error) {
    this.unbind();
    await super.doClose(reason);
    this.socket.destroy();
  }
}

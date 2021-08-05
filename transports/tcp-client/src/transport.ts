import net from 'net';
import {Transport, TransportOptions} from '@remly/core';

export class TCPClientTransport extends Transport {
  protected unbind: () => void;

  constructor(public readonly socket: net.Socket, options?: TransportOptions) {
    super(options);
    this.bind();
    if (socket.readable && socket.writable) {
      // readyState is 'open'
      this.open();
    }
  }

  get host() {
    return this.socket.remoteAddress;
  }

  get port() {
    return this.socket.remotePort;
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

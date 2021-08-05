import {Transport, TransportOptions} from '@remly/core';
import WebSocket from './websocket';

export class WebSocketTransport extends Transport {
  protected unbind: () => void;

  constructor(public readonly socket: WebSocket, options?: TransportOptions) {
    super(options);
    this.bind();
    if (this.socket.readyState === WebSocket.OPEN) {
      this.open();
    }
  }

  protected bind() {
    const onopen = () => this.open();
    const onerror = (error: Error) => this.onError(error);
    const onclose = () => this.doClose('connection lost');
    const onmessage = (message: any) => this.onData(message);

    this.socket.on('open', onopen);
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    this.socket.on('error', onerror);
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    this.socket.on('close', onclose);
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    this.socket.on('message', onmessage);

    this.unbind = () => {
      this.socket.off('open', onopen);
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      this.socket.off('error', onerror);
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      this.socket.off('close', onclose);
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      this.socket.off('message', onmessage);
    };
  }

  protected doSend(data: Buffer) {
    return new Promise((resolve, reject) =>
      this.socket.send(data, error => (error ? reject(error) : resolve(undefined))),
    );
  }

  protected async doClose(reason?: string | Error) {
    this.unbind();
    await super.doClose(reason);
    this.socket.close();
  }
}

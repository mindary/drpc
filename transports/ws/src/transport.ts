import {NetAddress, Transport, TransportOptions} from '@drpc/core';
import pick from 'tily/object/pick';
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

  get address(): NetAddress {
    return pick(
      ['localAddress', 'localPort', 'remoteAddress', 'remotePort', 'remoteFamily'],
      ((this.socket as any).socket ?? (this.socket as any)._socket ?? {}) as NetAddress,
    );
  }

  protected bind() {
    const onopen = () => this.open();
    const onerror = (event: WebSocket.ErrorEvent) => this.onError(event.error);
    const onclose = () => this.doClose('connection lost');
    const onmessage = (event: WebSocket.MessageEvent) => {
      // TODO event.data cloud be ArrayBuffer and Buffer[], we need find a way to deal with it
      this.onData(event.data as any).catch(err => this.onError(err));
    };

    this.socket.onopen = onopen;
    this.socket.onerror = onerror;
    this.socket.onclose = onclose;
    this.socket.onmessage = onmessage;

    this.unbind = () => {};
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

function isWebSocket(x: any): x is WebSocket {
  return (
    x &&
    (x instanceof WebSocket ||
      ('readyState' in x && 'protocol' in x && typeof x.close === 'function' && typeof x.send === 'function'))
  );
}

export function ws(handle: (transport: Transport) => any, options?: TransportOptions) {
  return (socket: WebSocket) => handle(new WebSocketTransport(socket, options));
}

export function accept(socket: any, options?: TransportOptions) {
  if (isWebSocket(socket)) {
    return new WebSocketTransport(socket, options);
  }
}

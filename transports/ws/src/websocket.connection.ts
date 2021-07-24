import Url from 'url-parse';
import {Connection, ConnectionOptions, Packet} from '@remly/core';
import WebSocket from './websocket';

export interface WebSocketConnectionOptions extends ConnectionOptions {
  socket?: WebSocket;
}

export class WebSocketConnection extends Connection {
  public host: string;
  public port: number;
  public binaryType: string;
  protected socket?: WebSocket;

  constructor(options?: WebSocketConnectionOptions) {
    super(options);
    this.socket = options?.socket;
    if (this.socket) {
      this.init();
      // socket already connected
      if (this.socket.readyState === this.socket.OPEN && !this.connected) {
        // eslint-disable-next-line no-void
        void this.doConnected();
      }
    }
  }

  protected bind(): void {
    if (!this.socket) {
      return;
    }
    const {socket} = this;
    const url = new Url(socket.url);
    this.host = url.hostname;
    this.port = +url.port;

    this.binaryType = 'arraybuffer';

    socket.onopen = async () => {
      await this.doConnected();
    };

    socket.onmessage = async (event: WebSocket.MessageEvent) => {
      await this.feed(event.data);
    };

    socket.onerror = async event => {
      await this.error(new Error(event.message));
    };

    socket.onclose = async (event: WebSocket.CloseEvent) => {
      if (event.code >= 1002 && event.code !== 1005 /* no status: ignore */) {
        await this.error(new Error(`WebSocket closed code: ${event.code}, reason: ${event.reason ?? '[empty]'}`));
      }
      await this.end();
    };
  }

  protected async close() {
    this.socket?.close();
  }

  protected async send(packet: Packet) {
    this.socket?.send(packet.frame());
  }
}

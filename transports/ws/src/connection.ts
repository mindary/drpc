import Url from 'url-parse';
import {Connection, ConnectionOptions, Packet, syncl} from '@remly/core';
import WebSocket from './ws';

export interface WSConnectionOptions extends ConnectionOptions {
  socket?: WebSocket;
}

export class WSConnection extends Connection {
  protected socket?: WebSocket;
  public host: string;
  public port: number;
  public binaryType: string;

  constructor(options?: WSConnectionOptions) {
    super(options);
    this.socket = options?.socket;
    if (this.socket) {
      this.init();
      // socket already connected
      if (this.socket.readyState === this.socket.OPEN && !this.connected) {
        this.doConnected();
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

    socket.onopen = () => {
      this.doConnected();
    };

    socket.onmessage = syncl(async (event: WebSocket.MessageEvent) => {
      await this.feed(event.data);
    }, this);

    socket.onerror = event => {
      this.error(new Error(event.message));
    };

    socket.onclose = syncl(async (event: WebSocket.CloseEvent) => {
      if (event.code >= 1002 && event.code !== 1005 /* no status: ignore */) {
        this.error(new Error(`WebSocket closed code: ${event.code}, reason: ${event.reason ?? '[empty]'}`));
      }
      await this.end();
    }, this);
  }

  protected async close() {
    this.socket?.close();
  }

  protected async send(packet: Packet) {
    this.socket?.send(packet.frame());
  }
}

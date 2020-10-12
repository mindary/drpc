import {assert} from 'ts-essentials';
import net from 'net';
import {Connection, ConnectionOptions, Packet, StandardParser, syncl} from '@remly/core';

export interface TCPConnectionOptions extends ConnectionOptions {
  socket?: net.Socket;
}

export class TCPConnection extends Connection {
  protected socket?: net.Socket;

  get host() {
    return this.socket?.remoteAddress;
  }

  get port() {
    return this.socket?.remotePort;
  }

  constructor(options?: TCPConnectionOptions) {
    super({
      ...options,
      parser: new StandardParser(),
    });
    this.socket = options?.socket;
    if (this.socket) {
      this.init();
      // socket already connected
      if (!this.socket.connecting && !this.socket.destroyed && !this.connected) {
        this.doConnected();
      }
    }
  }

  protected bind() {
    assert(this.socket);

    this.socket.on('connect', () => {
      this.doConnected();
    });

    this.socket.on(
      'data',
      syncl(async (data: any) => {
        await this.feed(data);
      }, this),
    );

    this.socket.on(
      'error',
      syncl(async (err: any) => {
        this.error(err);
        await this.end();
      }, this),
    );

    this.socket.on(
      'close',
      syncl(async () => {
        await this.end();
      }, this),
    );
  }

  protected async close() {
    this.socket?.destroy();
  }

  protected async send(packet: Packet) {
    this.socket?.write(packet.frame());
  }
}

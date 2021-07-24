import {assert} from 'ts-essentials';
import net from 'net';
import {Connection, ConnectionOptions, Packet, StandardParser} from '@remly/core';

export interface TCPConnectionOptions extends ConnectionOptions {
  socket?: net.Socket;
}

export class TCPConnection extends Connection {
  protected socket?: net.Socket;

  constructor(options?: TCPConnectionOptions) {
    super({
      ...options,
      parser: new StandardParser(),
    });
    this.socket = options?.socket;
    if (this.socket) {
      this.init();
    }
  }

  get host() {
    return this.socket?.remoteAddress;
  }

  get port() {
    return this.socket?.remotePort;
  }

  protected init() {
    assert(this.socket, 'socket is required');
    super.init();
    // socket already connected
    if (!this.socket.connecting && !this.socket.destroyed && !this.connected) {
      process.nextTick(() => this.doConnected());
    }
  }

  protected bind() {
    assert(this.socket);

    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    this.socket.on('connect', async () => {
      await this.doConnected();
    });

    this.socket.on(
      'data',
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      async (data: any) => {
        await this.feed(data);
      },
    );

    this.socket.on(
      'error',
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      async (err: any) => {
        await this.error(err);
        await this.end();
      },
    );

    this.socket.on(
      'close',
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      async () => {
        await this.end();
      },
    );
  }

  protected async close() {
    this.socket?.destroy();
  }

  protected async send(packet: Packet) {
    this.socket?.write(packet.frame());
  }
}

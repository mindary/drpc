import {assert} from 'ts-essentials';
import net from 'net';
import {Connection, DefaultParser, Packet, Registry} from '@remly/core';

export interface TCPConnectionOptions {
  registry?: Registry;
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
      parser: new DefaultParser(),
    });
    this.socket = options?.socket;
    if (this.socket) {
      this.init();
    }
  }

  protected bind() {
    assert(this.socket);

    this.socket.on('connect', () => this.doConnected());

    this.socket.on('data', data => {
      this.feed(data);
    });

    this.socket.on('error', err => {
      this.error(err);
      this.end();
    });

    this.socket.on('close', () => {
      this.end();
    });
  }

  protected close() {
    if (this.socket) {
      this.socket.destroy();
    }
  }

  protected send(packet: Packet) {
    if (this.socket) {
      this.socket.write(packet.frame());
    }
  }
}

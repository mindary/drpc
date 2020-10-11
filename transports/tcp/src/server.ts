import * as net from 'net';
import {DefaultRegistry, Registry} from '@remly/core';
import {Server, ServerOptions} from '@remly/server';
import {TCPConnection, TCPConnectionOptions} from './connection';

export class TCPServer extends Server<TCPConnection> {
  public readonly registry: Registry = new DefaultRegistry();

  static createServer(options?: ServerOptions) {
    return new this(options);
  }

  static attach(server: net.Server) {
    return this.createServer().attach(server);
  }

  constructor(options?: ServerOptions) {
    super(options);
  }

  protected createConnection(options?: TCPConnectionOptions): TCPConnection {
    return new TCPConnection(options);
  }

  attach(server: net.Server) {
    server.on('connection', (socket: net.Socket) => {
      if (socket.remoteAddress) {
        this.createAndRegisterConnection({socket});
      }
    });

    return this;
  }
}

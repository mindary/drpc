import * as net from 'net';
import {Registry} from '@remly/core';
import {Server, ServerDataEvents, ServerOptions} from '@remly/server';
import {TCPConnection, TCPConnectionOptions} from './connection';

export interface TCPServerDataEvents extends ServerDataEvents<TCPConnection> {}

export interface TCPServerOptions extends ServerOptions {}

export class TCPServer<DataEvents extends TCPServerDataEvents = TCPServerDataEvents> extends Server<
  TCPConnection,
  DataEvents & TCPServerDataEvents
> {
  public readonly registry: Registry = new Registry();

  static createServer(options?: TCPServerOptions) {
    return new TCPServer(options);
  }

  static attach(server: net.Server) {
    return this.createServer().attach(server);
  }

  constructor(options?: TCPServerOptions) {
    super(options);
  }

  protected createConnection(options?: TCPConnectionOptions): TCPConnection {
    return new TCPConnection(options);
  }

  attach(server: net.Server) {
    server.on('connection', (socket: net.Socket) => {
      if (socket.remoteAddress) {
        this.createAndBindConnection({socket});
      }
    });

    return this;
  }
}

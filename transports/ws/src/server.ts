import * as net from 'net';
import * as http from 'http';
import WebSocket, {ServerOptions} from 'ws';
import {TransportHandler} from '@remly/core';
import {WebSocketTransport} from '@remly/ws-client';

export interface WebSocketServerOptions extends ServerOptions {}

export class WebSocketServer {
  public readonly options: WebSocketServerOptions;
  public server: WebSocket.Server;
  protected onUpgradeListener: (request: http.IncomingMessage, socket: net.Socket, head: Buffer) => void;

  constructor(public handler: TransportHandler, options?: WebSocketServerOptions) {
    this.options = options ?? {};
    this.server = new WebSocket.Server({noServer: true, ...options});
    this.server.on('connection', socket => this.onConnection(socket));
    this.onUpgradeListener = (request: http.IncomingMessage, socket: net.Socket, head: Buffer) =>
      this.onUpgrade(request, socket, head);
  }

  static attach(handler: TransportHandler, httpServer: http.Server, options?: WebSocketServerOptions) {
    return new this(handler, options).attach(httpServer);
  }

  attach(server: http.Server) {
    server.on('upgrade', this.onUpgradeListener);
    return this;
  }

  detach(server: http.Server) {
    server.off('upgrade', this.onUpgradeListener);
    return this;
  }

  protected onUpgrade(request: http.IncomingMessage, socket: net.Socket, head: Buffer) {
    this.server.handleUpgrade(request, socket, head, ws => {
      this.server.emit('connection', ws, request);
    });
  }

  protected onConnection(socket: WebSocket) {
    this.add(socket);
  }

  protected add(socket: WebSocket) {
    const transport = new WebSocketTransport(socket);
    this.handler.handle(transport);
    return transport;
  }
}

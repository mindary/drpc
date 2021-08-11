import * as net from 'net';
import * as http from 'http';
import WebSocket, {ServerOptions} from 'ws';
import {Transport} from '@remly/core';
import {Application, Server, ServerChannelOptions} from '@remly/server';
import omit from 'tily/object/omit';
import {WebSocketServerTransport} from './transport';
import {assert} from 'ts-essentials';

export interface WebSocketServerOptions extends ServerChannelOptions, Omit<ServerOptions, 'server' | 'noServer'> {}

export class WebSocketServer extends Server<WebSocketServerOptions> {
  public wss: WebSocket.Server;
  public server?: http.Server;
  protected onUpgradeListener: (request: http.IncomingMessage, socket: net.Socket, head: Buffer) => void;
  protected onConnection: (socket: WebSocket) => void;
  private transports: Set<Transport> = new Set();

  constructor(options?: WebSocketServerOptions);
  constructor(app?: Application, options?: WebSocketServerOptions);
  constructor(appOrOptions?: any, options?: WebSocketServerOptions) {
    super(appOrOptions, options);
    this.onUpgradeListener = (request: http.IncomingMessage, socket: net.Socket, head: Buffer) =>
      this.onUpgrade(request, socket, head);
    this.onConnection = socket => this.add(socket);

    this.wss = new WebSocket.Server({noServer: true, ...omit(['port'], options)});
    this.wss.on('connection', socket => this.onConnection(socket));
  }

  get defaultOptions() {
    return {name: 'ws'};
  }

  get address() {
    if (!this.server) return null;
    return this.server.address();
  }

  static attach(httpServer: http.Server, options?: WebSocketServerOptions) {
    return new this(options).attach(httpServer);
  }

  attach(server: http.Server) {
    server.on('upgrade', this.onUpgradeListener);
    return this;
  }

  detach(server: http.Server) {
    server.off('upgrade', this.onUpgradeListener);
    return this;
  }

  async start() {
    if (this.server) return;
    assert(this.options.port != null, 'port is required');
    this.server = http.createServer();
    this.attach(this.server);
    return new Promise(resolve => {
      this.server!.listen(this.options.port, this.options.host, this.options.backlog, () => resolve(undefined));
    });
  }

  async stop() {
    if (!this.server) return;
    for (const t of this.transports) {
      await t.close('stop');
    }
    return new Promise((resolve, reject) => {
      this.server!.close(error => (error ? reject(error) : resolve(undefined)));
    }).then(() => (this.server = undefined));
  }

  protected onUpgrade(request: http.IncomingMessage, socket: net.Socket, head: Buffer) {
    this.wss.handleUpgrade(request, socket, head, ws => {
      this.wss.emit('connection', ws, request);
    });
  }

  protected async add(socket: WebSocket) {
    const transport = new WebSocketServerTransport(socket);
    this.transports.add(transport);
    // eslint-disable-next-line no-void
    void transport.once('close').then(() => this.transports.delete(transport));
    await this.emit('transport', transport);
  }
}

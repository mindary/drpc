import * as net from 'net';
import {AddressInfo, ListenOptions} from 'net';
import {Server, ServerOptions} from '@remly/server';
import {TCPConnection, TCPConnectionOptions} from './tcp.connection';

export interface TCPServerOptions extends ServerOptions, ListenOptions {}

export interface ServerListener {
  connection: (socket: net.Socket) => void;
}

export class TCPServer extends Server<TCPConnection> {
  protected options: TCPServerOptions;
  private serverListeners: ServerListener;

  constructor(options?: TCPServerOptions) {
    super(options);
    this.init();
  }

  protected _server?: net.Server;

  get server(): net.Server | undefined {
    return this._server;
  }

  get address(): AddressInfo | string | undefined {
    const addr = this._server?.address();
    return addr == null ? undefined : addr;
  }

  static createServer(options?: TCPServerOptions) {
    return new this(options);
  }

  static attach(server: net.Server) {
    return this.createServer().attach(server);
  }

  attach(server: net.Server) {
    server.on('connection', this.serverListeners.connection);
    return this;
  }

  detach(server: net.Server) {
    server.off('connection', this.serverListeners.connection);
    return this;
  }

  async start() {
    if (this._server) return;
    this._server = net.createServer();
    this.attach(this._server);
    await new Promise(resolve => this._server!.listen(this.options, () => resolve(undefined)));
    return this;
  }

  async stop() {
    if (!this._server) return;
    await new Promise((resolve, reject) => this._server!.close(err => (err ? reject(err) : resolve(undefined))));
    this._server = undefined;
    return this;
  }

  protected init() {
    this.serverListeners = {
      connection: async (socket: net.Socket) => {
        if (socket.remoteAddress) {
          await this.createAndRegisterConnection({socket});
        }
      },
    };
  }

  protected createConnection(options?: TCPConnectionOptions): TCPConnection {
    return new TCPConnection(options);
  }
}

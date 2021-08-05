import net, {AddressInfo, createServer, ListenOptions, Server, ServerOpts, Socket} from 'net';
import {TransportHandler} from '@remly/core';
import {TCPServerTransport} from './transport';
import {assert} from 'ts-essentials';

export interface TCPServerOptions extends ServerOpts, ListenOptions {}

export class TCPServer {
  public readonly options: TCPServerOptions;
  public _server?: Server;
  protected onConnectionListener: (socket: Socket) => void;

  constructor(public handler: TransportHandler, options?: TCPServerOptions) {
    this.options = options ?? {};

    this.onConnectionListener = socket => this.onConnection(socket);
  }

  get server(): net.Server | undefined {
    return this._server;
  }

  get address(): AddressInfo | string | undefined {
    const addr = this._server?.address();
    return addr == null ? undefined : addr;
  }

  attach(server: Server) {
    server.on('connection', this.onConnectionListener);
    return this;
  }

  detach(server: Server) {
    server.off('connection', this.onConnectionListener);
    return this;
  }

  async start() {
    if (!this.server) {
      assert(this.options.port, 'Must provide port');
      this._server = createServer(this.options);
      this.attach(this._server);
      await new Promise(resolve => this.server!.listen(this.options, () => resolve(null)));
    }
    return this;
  }

  async stop() {
    if (this.server) {
      await new Promise((resolve, reject) => {
        this.server!.close(error => (error ? reject(error) : resolve(null)));
      });
      this._server = undefined;
    }
    return this;
  }

  protected onConnection(socket: Socket) {
    if (socket.remoteAddress) {
      this.add(socket);
    }
  }

  protected add(socket: Socket) {
    const transport = new TCPServerTransport(socket);
    this.handler.handle(transport);
    return transport;
  }
}

import net, {createServer, ListenOptions, ServerOpts, Socket} from 'net';
import {Transport} from '@remly/core';
import {Application, Server, ServerChannelOptions} from '@remly/server';
import {assert} from 'ts-essentials';
import {TCPServerTransport} from './transport';

export interface TCPServerOptions extends ServerChannelOptions, ServerOpts, ListenOptions {}

export class TCPServer extends Server<TCPServerOptions> {
  public transports: Set<Transport> = new Set();
  protected onConnectionListener: (socket: Socket) => void;

  constructor(options?: TCPServerOptions);
  constructor(app?: Application, options?: TCPServerOptions);
  constructor(appOrOptions?: any, options?: any) {
    super(appOrOptions, options);
    this.onConnectionListener = socket => this.onConnection(socket);
  }

  get defaultOptions() {
    return {name: 'tcp'};
  }

  protected _server?: net.Server;

  get server(): net.Server | undefined {
    return this._server;
  }

  get address() {
    return this._server?.address() ?? null;
  }

  attach(server: net.Server) {
    server.on('connection', this.onConnectionListener);
    return this;
  }

  detach(server: net.Server) {
    server.off('connection', this.onConnectionListener);
    return this;
  }

  async start() {
    if (!this.server) {
      assert(this.options.port != null, 'port is required');
      this._server = createServer(this.options);
      this.attach(this._server);
      await new Promise(resolve => this.server!.listen(this.options, () => resolve(null)));
    }
    return this;
  }

  async stop() {
    if (this.server) {
      for (const t of this.transports) {
        await t.close('stop');
      }
      await new Promise((resolve, reject) => {
        this.server!.close(error => (error ? reject(error) : resolve(null)));
      });
      this._server = undefined;
    }
    return this;
  }

  protected async onConnection(socket: Socket) {
    if (socket.remoteAddress) {
      await this.add(socket);
    }
  }

  protected async add(socket: Socket) {
    const transport = new TCPServerTransport(socket);
    this.transports.add(transport);
    // eslint-disable-next-line no-void
    void transport.once('close').then(() => this.transports.delete(transport));
    await this.emit('transport', transport);
  }
}

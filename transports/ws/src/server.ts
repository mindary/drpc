import http from 'http';
import {Server, ServerOptions} from '@remly/server';
import WebSocket from './ws';
import {WSConnection, WSConnectionOptions} from './connection';

export class WSServer extends Server<WSConnection> {
  static createServer(options?: ServerOptions) {
    return new this(options);
  }

  static attach(server: http.Server, options?: ServerOptions) {
    return this.createServer(options).attach(server);
  }

  constructor(options?: ServerOptions) {
    super(options);
  }

  protected createConnection<O>(options?: O): WSConnection {
    return new WSConnection(options);
  }

  attach(server: http.Server) {
    const wsServer = new WebSocket.Server({server});

    wsServer.on('connection', socket => {
      this.createAndRegisterConnection<WSConnectionOptions>({socket});
    });

    return this;
  }
}

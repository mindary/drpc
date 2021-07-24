import http from 'http';
import {Server, ServerOptions} from '@remly/server';
import WebSocket from './websocket';
import {WebSocketConnection, WebSocketConnectionOptions} from './websocket.connection';

export class WebSocketServer extends Server<WebSocketConnection> {
  constructor(options?: ServerOptions) {
    super(options);
  }

  static createServer(options?: ServerOptions) {
    return new this(options);
  }

  static attach(server: http.Server, options?: ServerOptions) {
    return this.createServer(options).attach(server);
  }

  attach(server: http.Server) {
    const wsServer = new WebSocket.Server({server});

    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    wsServer.on('connection', async socket => {
      await this.createAndRegisterConnection<WebSocketConnectionOptions>({socket});
    });

    return this;
  }

  protected createConnection<O>(options?: O): WebSocketConnection {
    return new WebSocketConnection(options);
  }
}

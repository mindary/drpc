import {URL} from 'url';
import {ClientRequestArgs} from 'http';
import WebSocket from 'ws';
import {Client, ClientOptions} from '@remly/client';
import {WebSocketTransport} from './transport';

export interface WebSocketClientOptions extends ClientOptions {
  ws?: WebSocket.ClientOptions | ClientRequestArgs;
}

export class WebSocketClient extends Client {
  static connect(address: string | URL, options?: Partial<WebSocketClientOptions>) {
    options = options ?? {};
    return new this(options).connect(address, options.ws);
  }

  connect(address: string | URL, options?: WebSocket.ClientOptions | ClientRequestArgs) {
    return this.setTransport(new WebSocketTransport(new WebSocket(address, options)));
  }
}

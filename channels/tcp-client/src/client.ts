import net from 'net';
import {Client, ClientOptions} from '@remly/client';
import {TCPTransport} from './transport';
import {assert} from 'ts-essentials';

export class TCPClient extends Client {
  static connect(port: number, options?: ClientOptions): TCPClient;
  static connect(port: number, host?: string, options?: ClientOptions): TCPClient;
  static connect(port: number, hostOrOptions?: any, options?: any) {
    let host: string | undefined;
    if (typeof hostOrOptions === 'string') {
      host = hostOrOptions;
    } else {
      options = hostOrOptions;
    }
    const client = new this(options);
    client.connect(port, host);
    return client;
  }

  connect(port: number, host?: string) {
    assert(typeof port === 'number', 'Must pass a port.');
    const socket = net.connect(port, host);
    socket.once('connect', () => this.setTransport(new TCPTransport(socket)));
  }
}

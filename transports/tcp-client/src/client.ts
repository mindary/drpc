import net from 'net';
import {Client, ClientOptions} from '@remly/client';
import {TCPClientTransport} from './transport';
import {assert} from 'ts-essentials';

export class TCPClient extends Client {
  static connect(port: number, host?: string, options?: ClientOptions) {
    const client = new this(options);
    client.connect(port, host);
    return client;
  }

  connect(port: number, host?: string) {
    assert(typeof port === 'number', 'Must pass a port.');
    const socket = net.connect(port, host);
    socket.once('connect', () => this.setTransport(new TCPClientTransport(socket)));
  }
}

import net from 'net';
import {assert} from 'ts-essentials';
import {TCPConnection} from './connection';

export class TCPClient extends TCPConnection {
  static connect(port: number, host?: string) {
    const c = new this();
    c.connect(port, host);
    return c;
  }

  connect(port: number, host?: string) {
    assert(typeof port === 'number', 'Must pass a port.');
    assert(!this.socket);
    this.socket = net.connect(port, host);
    this.init();
  }
}

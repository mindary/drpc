import net from 'net';
import {assert} from 'ts-essentials';
import {DefaultRegistry} from '@remly/core';
import {TCPConnection, TCPConnectionOptions} from './tcp.connection';

export class TCPClient extends TCPConnection {
  constructor(options: TCPConnectionOptions = {}) {
    super(options);
    // enable client service
    this.registry = this.registry ?? new DefaultRegistry();
  }

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

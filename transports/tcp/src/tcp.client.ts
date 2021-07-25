import net from 'net';
import {assert} from 'ts-essentials';
import {ConnectionWithRegistryOptions, RegistryMixin} from '@remly/core';
import {TCPConnection, TCPConnectionOptions} from './tcp.connection';

export interface TCPClientOptions extends TCPConnectionOptions, ConnectionWithRegistryOptions {}

export class TCPClient extends RegistryMixin(TCPConnection) {
  constructor(options: TCPClientOptions = {}) {
    super(options);
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

import {WSConnection} from './connection';
import {assert} from 'ts-essentials';
import WebSocket from './ws';

export class WSClient extends WSConnection {
  static connect(port: number, host?: string, wss?: boolean) {
    return new this().connect(port, host, wss);
  }

  connect(port: number, host?: string, wss?: boolean) {
    assert(!this.socket, 'connection already assigned');
    assert(typeof port === 'number', 'port is required');
    const protocol = wss ? 'wss' : 'ws';
    host = host ?? 'localhost';
    this.socket = new WebSocket(`${protocol}://${host}:${port}`);
    this.init();
    return this;
  }
}

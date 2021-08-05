import {ValueOrPromise} from '@remly/types';
import debugFactory from 'debug';
import {Exception} from '@libit/error/exception';
import {Socket, SocketOptions} from './socket';
import {ConnectMessage, HeartbeatMessage, OpenMessage} from '../messages';

const debug = debugFactory('remly:core:socket:client');

export type AuthFn = (fn: (data: object) => ValueOrPromise<void>) => ValueOrPromise<void>;
export type Auth = object | AuthFn;

export interface ClientSocketOptions extends SocketOptions {
  auth: Auth;
}

export class ClientSocket extends Socket {
  public auth?: Auth;

  constructor(options?: Partial<ClientSocketOptions>) {
    options = options ?? {};
    super(options);
    this.auth = options.auth;
  }

  protected async handleOpen(message: OpenMessage) {
    debug('transport is open - connecting');
    this.keepalive = message.keepalive;
    if (typeof this.auth === 'function') {
      await this.auth(async data => {
        await this.send('connect', {payload: data});
      });
    } else {
      await this.send('connect', {payload: this.auth});
    }
  }

  protected async handleConnect(message: ConnectMessage) {
    const sid = message.payload?.sid;
    if (sid) {
      await this.doConnected(sid);
    } else {
      await this.emit('connect_error', new Exception('connect ack lacks "sid"'));
    }
  }

  protected handleAliveExpired(nonce: Buffer) {
    debug('keepalive expired, waiting for server ping');
  }

  protected async handlePing(message: HeartbeatMessage) {
    return this.send('pong', {payload: message.payload});
  }
}

import {ValueOrPromise} from '@remly/types';
import debugFactory from 'debug';
import {Exception} from '@libit/error/exception';
import {Socket, SocketOptions} from './socket';
import {ConnectMessage, HeartbeatMessage, OpenMessage} from '../messages';
import {AuthData} from '../types';
import {Remote} from '../remote';

const debug = debugFactory('remly:core:client-socket');

export interface OpenContext {
  socket: ClientSocket;
  challenge: Buffer;
}

export type AuthFn = (context: OpenContext) => ValueOrPromise<AuthData>;
export type Auth = AuthData | AuthFn;

export interface ClientSocketOptions extends SocketOptions {
  auth?: Auth;
}

export class ClientSocket extends Socket {
  public remote: Remote<ClientSocket>;
  public auth?: Auth;

  constructor(options?: Partial<ClientSocketOptions>) {
    options = options ?? {};
    super(options);
    this.auth = options.auth;
  }

  protected async handleOpen(message: OpenMessage) {
    debug('transport is open - connecting');
    const {keepalive, challenge} = message;
    this.keepalive = keepalive;
    this.handshake.auth =
      typeof this.auth === 'function'
        ? await this.auth({
            socket: this,
            challenge,
          })
        : this.auth ?? {};
    await this.send('connect', {
      payload: this.handshake.auth,
    });
  }

  protected async handleConnect(message: ConnectMessage) {
    const {sid} = message.payload ?? {};
    if (sid) {
      this.handshake.sid = sid;
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

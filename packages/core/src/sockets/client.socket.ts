import {ValueOrPromise} from '@remly/types';
import debugFactory from 'debug';
import {Exception} from '@libit/error/exception';
import {Socket, SocketOptions} from './socket';
import {ConnectMessage, HeartbeatMessage, OpenMessage} from '../messages';
import {Metadata} from '../types';
import {Remote} from '../remote';

const debug = debugFactory('remly:core:client-socket');

export interface OpenContext {
  socket: ClientSocket;
  challenge: Buffer;
}

export type OnClientConnect<SOCKET extends ClientSocket = ClientSocket> = (
  socket: SOCKET,
  challenge: Buffer,
) => ValueOrPromise<void>;

export interface ClientSocketOptions extends SocketOptions {
  metadata?: Metadata;
  onConnect?: OnClientConnect;
}

export class ClientSocket extends Socket {
  public remote: Remote<ClientSocket>;

  public onConnect?: OnClientConnect;

  constructor(options?: Partial<ClientSocketOptions>) {
    super(options);
    this.handshake.metadata = Object.assign({}, options?.metadata);
    this.onConnect = options?.onConnect;
  }

  get metadata() {
    return this.handshake.metadata;
  }

  protected async handleOpen(message: OpenMessage) {
    debug('transport is open - connecting');
    const {keepalive, challenge} = message;
    this.keepalive = keepalive;
    if (this.onConnect) {
      await this.onConnect(this, challenge);
    }
    Object.freeze(this.handshake.metadata);
    await this.send('connect', {
      payload: this.handshake.metadata,
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

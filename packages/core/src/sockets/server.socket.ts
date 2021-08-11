import {noop} from 'ts-essentials';
import {ValueOrPromise} from '@remly/types';
import {Socket, SocketOptions} from './socket';
import {Transport} from '../transport';
import {nonce} from '../utils';
import {ConnectMessage, HeartbeatMessage, OpenMessage} from '../messages';
import {AuthData} from '../types';
import {Remote} from '../remote';

export interface Handshake {
  auth: AuthData;
  challenge: Buffer;
}

export type Connect<T extends ServerSocket = ServerSocket> = (socket: T) => ValueOrPromise<any>;

export interface ServerSocketOptions extends SocketOptions {
  connect?: Connect;
}

export class ServerSocket extends Socket {
  public id: string;
  public remote: Remote<ServerSocket>;
  public connect: Connect;
  public handshake: Handshake;

  constructor(id: string, transport: Transport, options?: Partial<ServerSocketOptions>) {
    options = options ?? {};
    super({...options, id, transport});
    this.handshake = {} as any;
    this.connect = options.connect ?? noop;
    process.nextTick(() => this.open());
  }

  protected async open() {
    this.transport.sid = this.id;
    this.handshake.challenge = nonce();
    // sends an `open` packet
    await this.send('open', {
      sid: this.id,
      keepalive: this.keepalive,
      challenge: this.handshake.challenge,
    });

    await this.emit('open');
  }

  protected handleOpen(message: OpenMessage) {
    return this.doError('invalid open direction');
  }

  protected async handleConnect(message: ConnectMessage) {
    this.handshake.auth = message.payload;

    try {
      await this.connect(this);
      await this.send('connect', {payload: {sid: this.id}});
      await this.doConnected();
    } catch (e) {
      await this.send('connect_error', {message: e.message, payload: e.data});
    }
  }

  protected async handleAliveExpired(challenge: Buffer) {
    await this.send('ping', {payload: challenge});
  }

  protected handlePing(message: HeartbeatMessage): ValueOrPromise<void> {
    return this.doError('invalid ping direction');
  }
}

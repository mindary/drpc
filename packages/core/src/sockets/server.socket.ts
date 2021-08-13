import {noop} from 'ts-essentials';
import {ValueOrPromise} from '@remly/types';
import {Socket, SocketOptions} from './socket';
import {Transport} from '../transport';
import {nonce} from '../utils';
import {ConnectMessage, HeartbeatMessage, OpenMessage} from '../messages';
import {Remote} from '../remote';

export type OnServerConnect<T extends ServerSocket = ServerSocket> = (socket: T) => ValueOrPromise<any>;

export interface ServerSocketOptions extends SocketOptions {
  onConnect?: OnServerConnect;
}

export class ServerSocket extends Socket {
  /**
   * Additional information that can be attached to the Connection instance and which will be used in DTO/Persistent
   */
  public data: Record<string, any> = {};

  public remote: Remote<ServerSocket>;

  public id: string;
  public challenge: Buffer;
  public onConnect: OnServerConnect;

  constructor(id: string, transport: Transport, options?: Partial<ServerSocketOptions>) {
    super({...options, id, transport});
    this.onConnect = options?.onConnect ?? noop;
    process.nextTick(() => this.open());
  }

  protected async open() {
    this.transport.sid = this.id;
    this.challenge = nonce();
    // sends an `open` packet
    await this.send('open', {
      sid: this.id,
      keepalive: this.keepalive,
      challenge: this.challenge,
    });

    await this.emit('open', this);
  }

  protected handleOpen(message: OpenMessage) {
    return this.doError('invalid open direction');
  }

  protected async handleConnect(message: ConnectMessage) {
    this.handshake.metadata = message.payload ?? {};

    try {
      await this.onConnect(this);
      this.handshake.sid = this.id;
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

import {noop} from 'ts-essentials';
import {ValueOrPromise} from '@remly/types';
import {ConnectMessage, Handshake, HeartbeatMessage, OpenMessage, Transport} from '..';
import {Connect, Socket, SocketOptions} from './socket';

export interface ServerSocketOptions extends SocketOptions {
  connect?: Connect;
}

export class ServerSocket extends Socket {
  public id: string;
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

    // sends an `open` packet
    await this.send('open', {
      sid: this.id,
      keepalive: this.keepalive,
    });

    await this.emit('open');
  }

  protected handleOpen(message: OpenMessage) {
    return this.doError('invalid open direction');
  }

  protected async handleConnect(message: ConnectMessage) {
    const auth = (this.handshake.auth = message.payload);

    try {
      await this.connect({auth});
      await this.send('connect', {payload: {sid: this.id}});
      await this.doConnected();
    } catch (e) {
      await this.send('connect_error', {message: e.message, payload: e.data});
    }
  }

  protected async handleAliveExpired(nonce: Buffer) {
    await this.send('ping', {payload: nonce});
  }

  protected handlePing(message: HeartbeatMessage): ValueOrPromise<void> {
    return this.doError('invalid ping direction');
  }
}

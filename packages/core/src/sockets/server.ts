import {noop} from 'ts-essentials';
import {ValueOrPromise} from '@drpc/types';
import {Metadata, Packet} from '@drpc/packet';
import uniqid from 'uniqid';
import {Socket, SocketOptions} from './socket';
import {Transport} from '../transport';
import {Remote} from '../remote';
import {Carrier} from '../carrier';
import {RemoteError} from '../errors';
import {nonce} from '../utils';

export type OnServerConnect<SOCKET extends ServerSocket = any> = (
  carrier: Carrier<'connect', SOCKET>,
) => ValueOrPromise<any>;

export interface ServerSocketOptions extends SocketOptions {
  onconnect?: OnServerConnect;
  generateId?: () => string;
}

export class ServerSocket extends Socket {
  /**
   * Additional information that can be attached to the Connection instance and which will be used in DTO/Persistent
   */
  public data: Record<string, any> = {};

  public remote: Remote;

  public id: string;
  public nonce: Buffer;
  public onconnect: OnServerConnect;

  protected generateId: () => string;

  constructor(transport: Transport, options?: ServerSocketOptions) {
    super({...options, transport});
    this.onconnect = options?.onconnect ?? noop;
    this.generateId = options?.generateId ?? uniqid;
  }

  protected async handleConnect(packet: Packet<'connect'>) {
    const carrier = this.createCarrier(packet);

    const {message} = packet;

    if (message.keepalive > 120) {
      await carrier.error(new RemoteError('Invalid keepalive'));
    }

    this.nonce = nonce();
    this.id = message.clientId ?? this.generateId();

    try {
      this.keepalive = message.keepalive;
      this.metadata = packet.metadata ?? new Metadata();

      await this.onconnect(carrier);

      if (!carrier.ended) {
        await carrier.end(this.nonce);
      }
      await this.doConnected();
    } catch (e) {
      await carrier.error(e);
    }
  }

  protected handleConnack(packet: Packet<'connack'>): ValueOrPromise<void> {
    throw new Error('Invalid packet');
  }

  protected async handleAliveExpired(challenge: Buffer) {
    await this.send('ping', {payload: challenge});
  }

  protected handlePing(packet: Packet<'ping'>): ValueOrPromise<void> {
    return this.doError('invalid ping direction');
  }
}

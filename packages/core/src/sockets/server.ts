import {assert, noop} from 'ts-essentials';
import {ValueOrPromise} from '@drpc/types';
import {Packet} from '@drpc/packet';
import uniqid from 'uniqid';
import debugFactory from 'debug';
import {Socket, SocketOptions, SocketReservedEvents} from './socket';
import {Transport} from '../transport';
import {RemoteError} from '../errors';
import {Carrier} from '../carrier';
import {MetadataKeys} from '../keys';

const debug = debugFactory('drpc:core:socket:server');

export type OnServerSocketConnect = (carrier: Carrier<'connect'>) => ValueOrPromise<any>;

export interface ServerSocketOptions extends SocketOptions {
  generateId?: () => string;
  onconnect?: OnServerSocketConnect;
}

export class ServerSocket<EVENTS extends SocketReservedEvents = SocketReservedEvents> extends Socket<EVENTS> {
  /**
   * Additional information that can be attached to the Connection instance and which will be used in DTO/Persistent
   */
  public data: Record<string, any> = {};
  public session: Record<string, any> = {};
  public id: string;
  public onconnect: OnServerSocketConnect;

  protected generateId: () => string;

  constructor(transport: Transport, options?: ServerSocketOptions) {
    super({...options, transport});
    this.onconnect = options?.onconnect ?? noop;
    this.generateId = options?.generateId ?? uniqid;
  }

  protected async handleConnect(packet: Packet<'connect'>) {
    this.state = 'connecting';

    const carrier = this.createCarrier(packet);

    const {message} = packet;

    if (message.keepalive > 120) {
      await carrier.error(new RemoteError('Invalid keepalive'));
    }

    this.id = message.clientId ?? this.generateId();

    try {
      await this.onconnect(carrier);

      this.keepalive = message.keepalive;
      const m = packet.metadata;
      const [authmethod] = m?.getAsString(MetadataKeys.AUTH_METHOD) ?? [];

      if (authmethod) {
        assert(this.onauth, `Unsupported authentication method: ${authmethod}`);
        const authCarrier = this.createCarrier({
          type: 'auth',
          metadata: packet.metadata,
          message: {},
        });
        await this.onauth?.(authCarrier);
        if (authCarrier.respond === 'auth') {
          // continue authentication
          await authCarrier.res.endIfNotEnded('auth');
          return;
        }
      }

      // end authentication and connecting
      await carrier.res.endIfNotEnded('connack');
      await this.doConnected();
    } catch (e) {
      await carrier.error(e);
    }
  }

  /**
   * Auth packet handler.
   * client handle according to stage
   * server handle according to stage
   * @param packet
   * @protected
   */
  protected async handleAuth(packet: Packet<'auth'>) {
    const carrier = this.createCarrier(packet);

    try {
      const result = await this.onauth?.(carrier);
      if (!result && this.isConnecting()) {
        // end authentication
        await carrier.res.endIfNotEnded('connack');
        await this.doConnected();
        return;
      }
      // continue authentication
      await carrier.res.endIfNotEnded('auth');
    } catch (e: any) {
      if (!carrier.ended && e?.message) {
        await carrier.error(e);
      } else {
        console.error(e);
      }
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

  protected doDisconnect(): Promise<void> {
    debug('doDisconnect');
    return this.close();
  }
}

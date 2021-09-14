import debugFactory from 'debug';
import {Metadata, Packet} from '@drpc/packet';
import uniqid from 'uniqid';
import {Socket, SocketOptions, SocketReservedEvents} from './socket';
import {nextTick} from '../utils';
import {MarkRequired} from 'ts-essentials';
import {MetadataKeys} from '../keys';

const debug = debugFactory('drpc:core:socket:client');

export interface ClientSocketOptions extends SocketOptions {
  protocolId: string;
  protocolVersion: number;
  keepalive: number;
  clientId?: string;
  metadata?: Metadata;
}

const DEFAULT_CLIENT_SOCKET_OPTIONS: ClientSocketOptions = {
  protocolId: 'drpc',
  protocolVersion: 1,
  keepalive: 60,
};

export type ResolvedClientSocketOptions = MarkRequired<
  ClientSocketOptions,
  keyof typeof DEFAULT_CLIENT_SOCKET_OPTIONS & 'clientId'
>;

export class ClientSocket<EVENTS extends SocketReservedEvents = SocketReservedEvents> extends Socket<EVENTS> {
  public readonly options: ResolvedClientSocketOptions;
  public metadata: Metadata;

  constructor(options?: Partial<ClientSocketOptions>) {
    super({
      ...DEFAULT_CLIENT_SOCKET_OPTIONS,
      ...options,
    });
    this.options.clientId = this.options.clientId ?? 'drpc_' + uniqid();
    this.metadata = this.options.metadata ?? new Metadata();
  }

  get clientId() {
    return this.options.clientId;
  }

  protected open() {
    super.open();
    nextTick(() => this.doConnect());
  }

  protected doConnect() {
    this.state = 'connecting';
    this.send('connect', this.options, this.metadata).catch(e => this.emit('error', e));
  }

  protected handleConnect(packet: Packet<'connect'>) {
    throw new Error('Unsupported packet in client');
  }

  protected async handleAuth(packet: Packet<'auth'>) {
    const carrier = this.createCarrier(packet);
    try {
      await this.onauth?.(carrier);
      if (carrier.respond === 'auth') {
        await carrier.res.endIfNotEnded('auth');
      }
    } catch (e: any) {
      await this.emit('error', e);
    }
  }

  protected async handleConnack(packet: Packet<'connack'>) {
    if (packet.metadata?.has(MetadataKeys.AUTH_METHOD)) {
      await this.onauth?.(this.createCarrier({...packet, type: 'auth'}));
    }
    await this.doConnected();
  }

  protected handleAliveExpired(nonce: Buffer) {
    debug('keepalive expired, waiting for server ping');
  }

  protected async handlePing({message}: Packet<'ping'>) {
    return this.send('pong', message);
  }

  protected doDisconnect(): Promise<void> {
    debug('doDisconnect');
    // connect timeout or alive expired, disconnect transport and allow reconnecting
    return this.transport.close();
  }
}

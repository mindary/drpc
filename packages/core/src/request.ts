import {Socket} from './sockets';
import {MessageTypes, Metadata, MetadataValue} from '@drpc/packet';
import {Response} from './response';

export type RequestPacketType = 'connect' | 'signal' | 'call';

export interface RequestPacket<T extends RequestPacketType> {
  metadata?: Metadata;
  message: MessageTypes[T];
}

export class Request<T extends RequestPacketType, SOCKET extends Socket = any> {
  response: Response<T, SOCKET>;

  readonly metadata: Metadata;
  readonly message: MessageTypes[T];

  constructor(public readonly socket: SOCKET, public readonly type: T, packet: RequestPacket<T>) {
    this.metadata = packet?.metadata ?? new Metadata();
    this.message = packet?.message;
  }

  get sid() {
    return this.socket.id;
  }

  get address() {
    return this.socket.address;
  }

  get(ket: string): MetadataValue[] {
    return this.metadata.get(ket);
  }

  getMap() {
    return this.metadata.getMap();
  }

  isConnect() {
    return this.type === 'connect';
  }

  isCall() {
    return this.type === 'call';
  }

  isSignal() {
    return this.type === 'signal';
  }
}

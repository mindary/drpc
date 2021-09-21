import {Socket} from './sockets';
import {MessageTypes, Metadata, MetadataValue} from '@drpc/packet';
import {Response} from './response';

export type RequestPacketType = 'connect' | 'auth' | 'event' | 'call';

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

  has(key: string) {
    return this.metadata.has(key);
  }

  get(key: string): MetadataValue[] {
    return this.metadata.get(key);
  }

  getAsString(key: string): string[] {
    return this.metadata.getAsString(key);
  }

  getAsBuffer(key: string): Buffer[] {
    return this.metadata.getAsBuffer(key);
  }

  getMap() {
    return this.metadata.getMap();
  }

  isCall() {
    return this.type === 'call';
  }

  isEvent() {
    return this.type === 'event';
  }
}

export type CallRequest<SOCKET extends Socket = any> = Request<'call', SOCKET>;
export type EventRequest<SOCKET extends Socket = any> = Request<'event', SOCKET>;

export function isRequest(x?: any): x is Request<any> {
  return x && typeof x.type === 'string' && x.message;
}

export function isCallRequest(x?: any): x is Request<any> {
  return isRequest(x) && x.type === 'call';
}

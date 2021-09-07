import {Socket} from './sockets';
import {PacketType, Metadata, MetadataValue} from '@drpc/packet';
import {Response} from './response';

export interface RequestMessage {
  id?: number;
  name: string;
  params?: any;
}

export interface RequestPacket {
  metadata?: Metadata;
  message?: RequestMessage;
}

const EMPTY_REQUEST_MESSAGE: RequestMessage = {
  id: 0,
  name: '',
  params: undefined,
};

export class Request<SOCKET extends Socket = any> {
  response: Response;

  readonly metadata: Metadata;
  readonly message: RequestMessage;

  constructor(public readonly socket: SOCKET, public readonly type: PacketType, packet?: RequestPacket) {
    this.metadata = packet?.metadata ?? new Metadata();
    this.message = packet?.message ?? EMPTY_REQUEST_MESSAGE;
  }

  get sid() {
    return this.socket.id;
  }

  get address() {
    return this.socket.address;
  }

  get id(): number | undefined {
    return this.message.id;
  }

  get name() {
    return this.message.name;
  }

  set name(name) {
    this.message.name = name;
  }

  get params() {
    return this.message.params;
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

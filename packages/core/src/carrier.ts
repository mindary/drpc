import {Emittery} from '@libit/emittery';
import {PickProperties} from 'ts-essentials';
import {MessageTypes, MetadataValue} from '@drpc/packet';
import {Request, RequestPacketType} from './request';
import {Response} from './response';
import {Socket} from './sockets';

export interface CarrierEvents {
  ended: undefined;
  finished: undefined;
}

export class Carrier<T extends RequestPacketType, SOCKET extends Socket = any>
  extends Emittery<CarrierEvents>
  implements PickProperties<Request<any>, Function>, PickProperties<Response<any>, Function>
{
  constructor(public readonly request: Request<T, SOCKET>, public readonly response: Response<T, SOCKET>) {
    super();
  }

  get type() {
    return this.request.type;
  }

  get message(): MessageTypes[T] {
    return this.request.message;
  }

  get socket() {
    return this.request.socket;
  }

  get ended() {
    return this.response.ended;
  }

  get finished() {
    return this.response.finished;
  }

  get(key: string): MetadataValue[] {
    return this.request.get(key);
  }

  getMap(): {[p: string]: MetadataValue} {
    return this.request.getMap();
  }

  isCall(): boolean {
    return this.request.isCall();
  }

  isConnect(): boolean {
    return this.request.isConnect();
  }

  isSignal(): boolean {
    return this.request.isSignal();
  }

  error(err?: any): Promise<void> {
    return this.response.error(err);
  }

  set(key: string, value: MetadataValue): void {
    this.response.set(key, value);
  }

  add(key: string, value: MetadataValue): void {
    this.response.add(key, value);
  }

  remove(key: string): void {
    this.response.remove(key);
  }

  end(payload?: any): Promise<void> {
    return this.response.end(payload);
  }
}

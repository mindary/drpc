import {Emittery} from '@libit/emittery';
import {PickProperties} from 'ts-essentials';
import {MessageTypes, MetadataValue} from '@drpc/packet';
import {Request, RequestPacketType} from './request';
import {Response, ResponseType} from './response';
import {Socket} from './sockets';

export type RequestDelegates = PickProperties<Request<any>, Function>;
export type ResponseDelegates = Omit<PickProperties<Response<any>, Function>, 'end' | 'endIfNotEnded'>;

export interface CarrierEvents {
  ended: undefined;
  finished: undefined;
}

export class Carrier<T extends RequestPacketType, SOCKET extends Socket = any>
  extends Emittery<CarrierEvents>
  implements RequestDelegates, ResponseDelegates
{
  public respond: ResponseType<T> | boolean | undefined;

  constructor(public readonly req: Request<T, SOCKET>, public readonly res: Response<T, SOCKET>) {
    super();
  }

  get type() {
    return this.req.type;
  }

  get message(): MessageTypes[T] {
    return this.req.message;
  }

  get socket() {
    return this.req.socket;
  }

  get ended() {
    return this.res.ended;
  }

  get finished() {
    return this.res.finished;
  }

  has(key: string) {
    return this.req.has(key);
  }

  get(key: string): MetadataValue[] {
    return this.req.get(key);
  }

  getAsString(key: string): string[] {
    return this.req.getAsString(key);
  }

  getAsBuffer(key: string): Buffer[] {
    return this.req.getAsBuffer(key);
  }

  getMap(): {[p: string]: MetadataValue} {
    return this.req.getMap();
  }

  isCall(): boolean {
    return this.req.isCall();
  }

  isEvent(): boolean {
    return this.req.isEvent();
  }

  error(err?: any): Promise<void> {
    return this.res.error(err);
  }

  set(key: string, value: MetadataValue): void {
    this.res.set(key, value);
  }

  add(key: string, value: MetadataValue): void {
    this.res.add(key, value);
  }

  remove(key: string): void {
    this.res.remove(key);
  }
}

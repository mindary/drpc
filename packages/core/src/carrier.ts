import {Emittery} from '@libit/emittery';
import {PickProperties} from 'ts-essentials';
import {MetadataValue} from '@remly/packet';
import {Request} from './request';
import {Response} from './response';
import {Socket} from './sockets';

export interface CarrierEvents {
  ended: undefined;
  finished: undefined;
}

export class Carrier<SOCKET extends Socket = any>
  extends Emittery<CarrierEvents>
  implements PickProperties<Request, Function>, PickProperties<Response, Function>
{
  constructor(public readonly request: Request<SOCKET>, public readonly response: Response<SOCKET>) {
    super();
  }

  get id(): number | undefined {
    return this.request.id;
  }

  get name(): string {
    return this.request.name;
  }

  get params(): any {
    return this.request.params;
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

  get(ket: string): MetadataValue[] {
    return this.request.get(ket);
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

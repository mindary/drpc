import {Emittery} from '@libit/emittery';
import {Socket} from '../sockets';
import {RequestContent} from './types';

export interface ContextEvents {
  ended: undefined;
  finished: undefined;
}

const EMPTY_REQUEST_MESSAGE: RequestContent = {
  id: 0,
  name: '',
  params: undefined,
};

export abstract class Request<SOCKET extends Socket = any> extends Emittery<ContextEvents> {
  readonly content: RequestContent;

  protected _ended: boolean;
  protected _finished: boolean;

  constructor(public readonly socket: SOCKET, content?: RequestContent) {
    super();
    this.content = content ?? EMPTY_REQUEST_MESSAGE;
  }

  get ended() {
    return this._ended;
  }

  get finished() {
    return this._finished;
  }

  get sid() {
    return this.socket.id;
  }

  get address() {
    return this.socket.address;
  }

  get id(): number | undefined {
    return this.content.id;
  }

  get name() {
    return this.content.name;
  }

  set name(name) {
    this.content.name = name;
  }

  get params() {
    return this.content.params;
  }

  set params(params: any) {
    this.content.params = params;
  }

  hasId() {
    return this.id != null && this.id > 0;
  }

  hasName() {
    return !!this.name;
  }

  isConnect() {
    return !this.hasId() && !this.hasName();
  }

  isCall() {
    return this.hasId() && this.hasName();
  }

  isSignal() {
    return !this.hasId() && this.hasName();
  }

  abstract end(payload?: any): Promise<any>;

  abstract error(err?: any): Promise<any>;
}

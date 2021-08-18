import {RequestContent} from './types';
import {Socket} from '../sockets';

export class OutgoingRequest<SOCKET extends Socket = any> {
  constructor(public readonly socket: SOCKET, public readonly content: RequestContent) {}

  get id() {
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
}

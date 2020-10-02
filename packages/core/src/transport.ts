import {TransportContext} from './defines';
import {EventEmitter} from 'events';
import {RequestMessage} from './request';
import {ResponseMessage} from './response';

export class Transport extends EventEmitter {
  protected _context = {};

  constructor() {
    super();
  }

  protected sureContext(context?: TransportContext): TransportContext {
    return context ?? this._context;
  }

  recv(message: RequestMessage | ResponseMessage, context?: TransportContext) {
    this.emit('message', message, this.sureContext(context));
  }

  async send(
    message: RequestMessage | ResponseMessage,
    context?: TransportContext,
  ) {
    throw new Error('Unimplemented');
  }

  close() {}
}

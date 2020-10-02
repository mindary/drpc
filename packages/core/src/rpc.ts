import {Provider} from './provider';
import {TransportContext, Framer} from './defines';
import {Transport} from './transport';
import {ResponseMessage} from './response';
import {RequestMessage} from './request';

export interface RPCOptions {
  id?: any;
  timeout?: number;
  framer?: Framer<any>;
  methods?: {[name: string]: Function};
}

export class RPC extends Provider {
  id: any;

  protected _transport: Transport;

  static create(transport: Transport, options: RPCOptions = {}) {
    return new RPC(transport, options);
  }

  constructor(transport: Transport, options: RPCOptions = {}) {
    super(undefined, options.timeout);
    this._transport = transport;

    this.id = options.id;

    this.init(options);
  }

  get transport() {
    return this._transport;
  }

  protected init(options: RPCOptions) {
    // handle incoming message
    this._transport.on('error:decode', (err, context) => {
      // eslint-disable-next-line no-void
      void this.dispatchError(err, null, context);
    });

    this._transport.on('message', (message, context) => {
      try {
        this.handle(message, context);
      } catch (e) {
        // eslint-disable-next-line no-void
        void this.dispatchError(e, message.id, context);
      }
    });

    this._transport.on('error', error => {
      this.emit('error', error);
    });

    this._transport.on('exit', (code, signal) => {
      this.emit('exit', code, signal);
    });

    if (options.methods) {
      this.methods(options.methods);
    }
  }

  async dispatch(
    message: RequestMessage | ResponseMessage,
    context?: TransportContext,
  ) {
    // handle outgoing message
    await this._transport.send(message, context);
  }

  async close() {
    return this._transport.close();
  }
}

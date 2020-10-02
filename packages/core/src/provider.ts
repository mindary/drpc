import {EventEmitter} from 'events';
import {Method} from './method';
import {TransportContext, Dispatcher} from './defines';
import {
  isRequest,
  isSignal,
  makeRequest,
  RequestMessage,
  SignalMessage,
} from './request';
import {
  FailureError,
  isFailure,
  isResponse,
  isSuccess,
  makeFailure,
  makeFailureErrorFrom,
  makeMethodNotFoundError,
  makeParseError,
  makeSuccess,
  ResponseMessage,
} from './response';
import {nextId} from './utils';
import {TimeoutError} from './errors';

export interface Listener<T> {
  (event: T): any;
}

export interface Disposable {
  dispose(): void;
}

export interface Transaction {
  id: number;
  hTimeout?: any;

  resolve(result: any): void;

  reject(error: FailureError | Error): void;
}

export class Provider extends EventEmitter {
  private _signals = new EventEmitter();
  private _methods: {[id: string]: Method} = {};
  private _txs: {[id: string]: Transaction} = {};

  protected _dispatch?: Dispatcher;
  protected _timeout = 0;

  constructor(dispatch?: Dispatcher | null, timeout?: number) {
    super();
    this._dispatch = dispatch ? dispatch : undefined;
    this._timeout = timeout ?? 0;
  }

  async dispatch(message: any, context?: TransportContext) {
    if (!this._dispatch) {
      throw new Error('Not implemented');
    }
    return this._dispatch(message, context);
  }

  async dispatchError(
    err: any,
    id?: number | string | null,
    context?: TransportContext,
  ) {
    return this.dispatch(makeFailure(makeFailureErrorFrom(err), id), context);
  }

  method(name: string, definition: any): void {
    const isMethod = definition instanceof Method;
    const isFunction = typeof definition === 'function';

    // a valid method is either a function or a client (relayed method)
    if (!isMethod && !isFunction) {
      return;
      // throw new TypeError('method definition must be either a function or an instance of Method');
    }

    if (/^rpc\./.test(name)) {
      throw new TypeError('"' + name + '" is a reserved method name');
    }

    // make instance of jayson.Method
    if (!isMethod) {
      definition = new Method(definition, {});
    }

    this._methods[name] = definition;
  }

  methods(methods: {[name: string]: Function}): this {
    methods = methods || {};

    for (const name in methods) {
      this.method(name, methods[name]);
    }

    return this;
  }

  hasMethod(name: string): boolean {
    return name in this._methods;
  }

  removeMethod(name: string): void {
    if (this.hasMethod(name)) {
      delete this._methods[name];
    }
  }

  onSignal(signal: string | symbol, listener: Listener<any>): Disposable {
    this._signals.on(signal, listener);
    return {
      dispose: () => this.offSignal(signal, listener),
    };
  }

  offSignal(signal: string | symbol, listener: Listener<any>) {
    return this._signals.removeListener(signal, listener);
  }

  offAllSignals(signal?: string | symbol) {
    return this._signals.removeAllListeners(signal);
  }

  async call(name: string, params: any): Promise<any> {
    if (!this._methods[name]) {
      throw new Error(`invalid method ${name}`);
    }

    return this._methods[name].execute(this, params);
  }

  handle(
    message: RequestMessage | ResponseMessage,
    context?: TransportContext,
  ) {
    if (isSignal(message)) {
      return this._handleSignal(message, context);
    } else if (isRequest(message)) {
      return this._handelRequest(message, context);
    } else if (isResponse(message)) {
      return this._handleResponse(message, context);
    }

    throw makeParseError();
  }

  request<T = any>(
    method: string,
    params?: any,
    options?: any | number,
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      if (typeof options === 'number') {
        options = {timeout: options};
      }
      options = options || {};

      const timeout = options.timeout != null ? options.timeout : this._timeout;
      const id: number = nextId();
      const transaction = (this._txs[id] = {id, resolve, reject});

      if (timeout > 0) {
        this._txs[id].hTimeout = setTimeout(
          () => this._handleTimeout(transaction),
          timeout,
        );
      }

      this.dispatch(makeRequest(method, params, id)).catch(e => {
        this._clearTransaction(transaction);
        reject(e);
      });
    });
  }

  async signal(name: string, payload?: any) {
    await this.dispatch(makeRequest(name, payload));
  }

  protected _handleSignal(
    message: SignalMessage,
    context?: TransportContext,
  ): void {
    if (this._signals.listenerCount(message.method)) {
      this._signals.emit(message.method, message.params, context);
    } else {
      this.emit('signal', message.method, message.params);
    }
  }

  protected async _handelRequest(
    message: RequestMessage,
    context?: TransportContext,
  ) {
    if (!this._methods[message.method]) {
      return this.dispatchError(
        makeMethodNotFoundError(message.method),
        message.id,
        context,
      );
    }

    try {
      const result = await this.call(message.method, message.params);
      return await this.dispatch(makeSuccess(result, message.id), context);
    } catch (e) {
      return this.dispatch(
        makeFailure(makeFailureErrorFrom(e), message.id),
        context,
      );
    }
  }

  protected _handleResponse(
    message: ResponseMessage,
    context?: TransportContext,
  ): any {
    if (message.id == null || !this._txs[message.id]) {
      return this.emit('response:invalid-id', message);
    }

    const id = message.id;

    if (isSuccess(message)) {
      this._txs[id].resolve(message.result);
      this._clearTransaction(this._txs[id]);
    } else if (isFailure(message)) {
      this._txs[id].reject(message.error);
      this._clearTransaction(this._txs[id]);
    } else {
      return this.emit('response:invalid-message', message);
    }
  }

  protected _handleTimeout(transaction: Transaction): void {
    transaction.reject(new TimeoutError('transaction timed out'));
    delete this._txs[transaction.id];
  }

  protected _clearTransaction(transaction: Transaction): void {
    if (typeof transaction.hTimeout !== 'undefined') {
      clearTimeout(transaction.hTimeout);
    }

    delete this._txs[transaction.id];
  }
}

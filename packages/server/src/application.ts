import debugFactory from 'debug';
import {
  CallContext,
  ConnectContext,
  OnCall,
  OnServerConnect,
  OnSignal,
  Registry,
  Serializer,
  Transport,
} from '@remly/core';
import {Emittery, UnsubscribeFn} from '@libit/emittery';
import {Interception} from '@remly/interception';
import {Connection} from './connection';
import {generateId} from './utils';
import {MsgpackSerializer} from '../../serializer-msgpack';
import {Server} from './server';
import {ServerCallHandler, ServerConnectHandler} from './types';

const debug = debugFactory('remly:server:application');

export interface ApplicationEvents {
  error: Error;
  connection: Connection;
  disconnect: Connection;
  connectionClose: Connection;
}

export interface ApplicationOptions {
  registry?: Registry;
  serializer?: Serializer;
  connectTimeout?: number;
  requestTimeout?: number;
}

export const DEFAULT_APPLICATION_OPTIONS = {
  connectTimeout: 45000,
  requestTimeout: 10000,
};

export class ApplicationEmittery extends Emittery<ApplicationEvents> {
  //
}

export class Application extends ApplicationEmittery {
  public readonly serializer: Serializer;
  public readonly connections: Map<string, Connection> = new Map();

  public onconnect: OnServerConnect;
  public oncall: OnCall;
  public onsignal: OnSignal;

  protected options: ApplicationOptions;
  protected onTransport: (transport: Transport) => void;

  protected connectionsUnsubs: Map<string, UnsubscribeFn[]> = new Map();

  protected connectInterception = new Interception<ConnectContext<Connection>>();
  protected incomingInterception = new Interception<CallContext<Connection>>();

  constructor(options: Partial<ApplicationOptions> = {}) {
    super();
    this.options = Object.assign({}, DEFAULT_APPLICATION_OPTIONS, options);
    this.connectTimeout = this.options.connectTimeout;
    this.serializer = this.options.serializer ?? new MsgpackSerializer();
    this.onTransport = transport => this.handle(transport);
  }

  private _connectTimeout: number;

  get connectTimeout(): number {
    return this._connectTimeout;
  }

  set connectTimeout(timeout: number | undefined) {
    this._connectTimeout = timeout ? timeout : DEFAULT_APPLICATION_OPTIONS.connectTimeout;
  }

  private _requestTimeout: number;

  get requestTimeout() {
    return this._requestTimeout;
  }

  set requestTimeout(timeout: number | undefined) {
    this._requestTimeout = timeout ? timeout : DEFAULT_APPLICATION_OPTIONS.requestTimeout;
  }

  bind(server: Server<any, any>) {
    server.on('transport', this.onTransport);
    return this;
  }

  unbind(server: Server<any, any>) {
    server.off('transport', this.onTransport);
    return this;
  }

  addConnectInterceptor(interceptor: ServerConnectHandler) {
    this.connectInterception.add(interceptor);
    return this;
  }

  addIncomingInterceptor(interceptor: ServerCallHandler) {
    this.incomingInterception.add(interceptor);
    return this;
  }

  handle(transport: Transport) {
    new Connection(generateId(), transport, {
      serializer: this.serializer,
      connectTimeout: this.connectTimeout,
      requestTimeout: this.requestTimeout,
      onconnect: context => this.handleConnect(context),
      oncall: context => this.handleCall(context),
      onsignal: context => this.handleCall(context),
    });
  }

  protected async handleConnect(context: ConnectContext<Connection>) {
    const {socket} = context;
    debug('adding connection', socket.id);
    try {
      await this.connectInterception.invoke(context);
      await this.doConnect(context);
    } catch (e) {
      await context.error(e);
    }
  }

  protected async handleCall(context: CallContext<Connection>) {
    try {
      // Both "call" and "signal" will share same interceptors
      await this.incomingInterception.invoke(context);

      //
      // The reason we need to handle "call" and "signal" separately is that "call" needs to ensure that the service
      // provides the corresponding method, otherwise will send "Method not found" error.
      //
      // But "signal" does not perform such a check.
      //
      if (context.id) {
        await this.doCall(context);
      } else {
        await this.doSignal(context);
      }
    } catch (e) {
      await context.error(e);
    }
  }

  protected async doConnect(context: ConnectContext<Connection>) {
    const {socket} = context;

    if (!socket.isOpen()) {
      return debug('socket has been closed - cancel connect');
    }

    if (this.onconnect) {
      await this.onconnect(context);
    }

    this.connections.set(socket.id, socket);
    this.connectionsUnsubs.set(socket.id, [
      socket.on('connected', () => this._connected(socket)),
      socket.on('close', () => this._remove(socket)),
    ]);
  }

  protected async doCall(context: CallContext<Connection>) {
    if (this.oncall) {
      await this.oncall(context);
    }
    return respond(context);
  }

  protected async doSignal(context: CallContext<Connection>) {
    if (this.onsignal) {
      await this.onsignal(context);
    }
  }

  protected async _connected(connection: Connection) {
    await this.emit('connection', connection);
  }

  protected async _remove(connection: Connection) {
    if (this.connections.has(connection.id)) {
      this.connections.delete(connection.id);

      this.connectionsUnsubs.get(connection.id)?.forEach(fn => fn());
      this.connectionsUnsubs.delete(connection.id);

      await this.emit('disconnect', connection);
      await this.emit('connectionClose', connection);
    } else {
      debug('ignoring remove for connection %s', connection.id);
    }
  }
}

export function respond(context: CallContext<Connection>) {
  const result = context.result;
  if (!context.ended) {
    return context.end(result);
  }
}

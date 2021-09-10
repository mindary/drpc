import 'ts-essentials';
import '@libit/interceptor';

import {Next} from '@libit/interceptor';
import {Interception} from '@drpc/interception';
import {
  ActionPacketType,
  Carrier,
  ClientSocket,
  Emittery,
  Metadata,
  OnIncoming,
  Remote,
  SocketEvents,
  Transport,
} from '@drpc/core';
import {ClientOptions, ClientOutgoingHandler, ClientRequest, ClientIncomingHandler, WrappedConnect} from './types';

export class Client extends Emittery<SocketEvents> {
  public socket: ClientSocket;
  public onincoming?: OnIncoming<ActionPacketType, ClientSocket>;
  public oncall?: OnIncoming<'call', ClientSocket>;
  public onsignal?: OnIncoming<'signal', ClientSocket>;
  public metadata: Metadata;
  public _reconnectCount: number;

  protected incomingInterception = new Interception<Carrier<ActionPacketType>>();
  protected outgoingInterception = new Interception<ClientRequest>();

  readonly #connect: WrappedConnect;
  readonly #options: ClientOptions;

  static async connect(connect: WrappedConnect, options: ClientOptions) {
    return new this(connect, options).connect();
  }

  protected constructor(connect: WrappedConnect, options: ClientOptions) {
    super();
    this.#connect = connect;
    this.#options = options;
    this.onincoming = (carrier, next) =>
      carrier.isCall() ? this.oncall?.(carrier as any, next) : this.onsignal?.(carrier as any, next);

    this.metadata = options.metadata ? Metadata.from(options.metadata) : new Metadata();

    this._reconnectCount = 0;
  }

  get id() {
    return this.socket.id;
  }

  get remote(): Remote<ClientSocket> {
    return this.socket.remote;
  }

  ready() {
    return this.socket.ready();
  }

  addIncomingInterceptor(handler: ClientIncomingHandler) {
    this.incomingInterception.add(handler);
    return this;
  }

  addOutgoingInterceptor(handler: ClientOutgoingHandler) {
    this.outgoingInterception.add(handler);
    return this;
  }

  close() {
    return this.socket.close();
  }

  protected async connect() {
    this.socket = this.createSocket(this.#connect(this));
    return this;
  }

  protected createSocket(transport?: Transport) {
    const socket = new ClientSocket({
      ...this.#options,
      metadata: this.#options.metadata ? Metadata.from(this.#options.metadata) : undefined,
      onincoming: (carrier, next) => this.handleIncoming(carrier, next),
      onoutgoing: (request, next) => this.handleOutgoing(request, next),
    });

    const unsub = socket.onAny((event, data) => this.emit(event, data));
    socket
      .once('close')
      .then(unsub)
      .catch(() => {});

    if (transport) socket.setTransport(transport);
    return socket;
  }

  protected async handleIncoming(carrier: Carrier<ActionPacketType>, next: Next) {
    return this.incomingInterception.invoke(carrier, async () => this.onincoming?.(carrier, next));
  }

  protected async handleOutgoing(request: ClientRequest, next: Next) {
    return this.outgoingInterception.invoke(request, next);
  }
}

import 'ts-essentials';
import '@libit/interceptor';

import {Next} from '@libit/interceptor';
import {Interception} from '@drpc/interception';
import {ActionPacketType, Carrier, ClientSocket, Metadata, OnIncoming} from '@drpc/core';
import {ClientIncomingHandler, ClientOptions, ClientOutgoingHandler, ClientRequest, WrappedConnect} from './types';

export class Client extends ClientSocket {
  public onincoming?: OnIncoming;
  public oncall?: OnIncoming<'call', Client>;
  public onevent?: OnIncoming<'event', Client>;
  public _reconnectCount: number;

  protected incomingInterception = new Interception<Carrier<ActionPacketType>>();
  protected outgoingInterception = new Interception<ClientRequest>();

  readonly #connect: WrappedConnect;

  protected constructor(connect: WrappedConnect, options: ClientOptions) {
    super({
      ...options,
      metadata: options.metadata ? Metadata.from(options.metadata) : new Metadata(),
      onincoming: (carrier, next) => this.handleIncoming(carrier, next),
      onoutgoing: (request, next) => this.handleOutgoing(request, next),
    });
    this.#connect = connect;
    this.onincoming =
      this.options.onincoming ??
      ((carrier, next) =>
        carrier.type === 'call' ? this.oncall?.(carrier as any, next) : this.onevent?.(carrier as any, next));

    this._reconnectCount = 0;
  }

  static async connect(connect: WrappedConnect, options: ClientOptions) {
    return new this(connect, options).connect();
  }

  addIncomingInterceptor(handler: ClientIncomingHandler) {
    this.incomingInterception.add(handler);
    return this;
  }

  addOutgoingInterceptor(handler: ClientOutgoingHandler) {
    this.outgoingInterception.add(handler);
    return this;
  }

  async connect() {
    if (!this.isConnected()) {
      this.attach(this.#connect(this));
    }
    return this;
  }

  protected async handleIncoming(carrier: Carrier<ActionPacketType>, next: Next) {
    return this.incomingInterception.invoke(carrier, async () => this.onincoming?.(carrier, next));
  }

  protected async handleOutgoing(request: ClientRequest, next: Next) {
    return this.outgoingInterception.invoke(request, next);
  }
}

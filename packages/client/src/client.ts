import 'ts-essentials';
import '@libit/interceptor';

import {ClientSocket, ClientSocketOptions, Emittery, OnRequest, Remote, SocketEvents} from '@remly/core';
import {Interception} from '@remly/interception';
import {Next} from '@libit/interceptor';
import {CLIENT_UNSUBS, ClientOutgoingHandler, ClientRequest, ClientRequestHandler} from './types';

export interface ClientOptions extends ClientSocketOptions {}

export class Client extends Emittery<SocketEvents> {
  public socket: ClientSocket;

  public onincoming?: OnRequest<ClientSocket>;
  public oncall?: OnRequest<ClientSocket>;
  public onsignal?: OnRequest<ClientSocket>;

  protected incomingInterception = new Interception<ClientRequest>();
  protected outgoingInterception = new Interception<ClientRequest>();

  constructor(public options?: ClientOptions) {
    super();
    this.options = options ?? {};
    this.socket = this.createSocket();
    this.onincoming = (request, next) =>
      request.isCall() ? this.oncall?.(request, next) : this.onsignal?.(request, next);
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

  addIncomingInterceptor(handler: ClientRequestHandler) {
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

  protected createSocket() {
    const socket = new ClientSocket({
      ...this.options,
      onincoming: (request, next) => this.handleIncoming(request, next),
      onoutgoing: (request, next) => this.handleOutgoing(request, next),
    });
    this.bind(socket);
    return socket;
  }

  protected bind(socket: ClientSocket) {
    (socket as any)[CLIENT_UNSUBS] = [socket.onAny((event, data) => this.emit(event, data))];
  }

  protected unbind(socket: ClientSocket) {
    const unsubs = (socket as any)[CLIENT_UNSUBS];
    while (unsubs?.length) {
      unsubs.shift()();
    }
  }

  protected async handleIncoming(request: ClientRequest, next: Next) {
    return this.incomingInterception.invoke(request, async () => this.onincoming?.(request, next));
  }

  protected async handleOutgoing(request: ClientRequest, next: Next) {
    return this.outgoingInterception.invoke(request, next);
  }
}

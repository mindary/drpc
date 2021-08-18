import 'ts-essentials';
import '@libit/interceptor';

import {
  ClientSocket,
  ClientSocketOptions,
  Emittery,
  IncomingRequest,
  OnRequest,
  OutgoingRequest,
  Remote,
  SocketEvents,
} from '@remly/core';
import {Interception, InterceptionHandler} from '@remly/interception';
import {Next} from '@libit/interceptor';
import {CLIENT_UNSUBS, ClientIncomingRequest, ClientOutgoingRequest} from './types';

export interface ClientOptions extends ClientSocketOptions {
  onrequest?: OnRequest<ClientSocket>;
}

export class Client extends Emittery<SocketEvents> {
  public socket: ClientSocket;

  public onrequest?: OnRequest<ClientSocket>;

  protected requestInterception = new Interception<ClientIncomingRequest>();
  protected dispatchInterception = new Interception<ClientOutgoingRequest>();

  constructor(public options?: ClientOptions) {
    super();
    this.options = options ?? {};
    this.socket = this.createSocket();
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

  protected createSocket() {
    const socket = new ClientSocket({
      ...this.options,
      onrequest: request => this.doRequest(request),
      dispatch: (request, next) => this.doDispatch(request, next),
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

  addRequestInterceptor(handler: InterceptionHandler<IncomingRequest<ClientSocket>>) {
    this.requestInterception.add(handler);
    return this;
  }

  addRemoteInterceptor(handler: InterceptionHandler<OutgoingRequest<ClientSocket>>) {
    this.dispatchInterception.add(handler);
    return this;
  }

  close() {
    return this.socket.close();
  }

  protected async doRequest(request: ClientIncomingRequest) {
    return this.requestInterception.invoke(request, async () => {
      await this.onrequest?.(request);
    });
  }

  protected async doDispatch(request: ClientOutgoingRequest, next: Next) {
    return this.dispatchInterception.invoke(request, next);
  }
}

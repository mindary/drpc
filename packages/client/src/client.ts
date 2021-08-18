import 'ts-essentials';
import '@libit/interceptor';

import {ClientSocket, ClientSocketOptions, Emittery, OnRequest, Remote, Request, SocketEvents} from '@remly/core';
import {Interception, InterceptionHandler} from '@remly/interception';
import {CLIENT_UNSUBS} from './types';

export interface ClientOptions extends ClientSocketOptions {
  onrequest?: OnRequest<ClientSocket>;
}

export class Client extends Emittery<SocketEvents> {
  public socket: ClientSocket;

  public onrequest?: OnRequest<ClientSocket>;

  protected requestInterception = new Interception<Request<ClientSocket>>();
  protected remoteInterception = new Interception<Request<ClientSocket>>();

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
    const socket = new ClientSocket(this.options);
    this.bind(socket);
    return socket;
  }

  protected bind(socket: ClientSocket) {
    socket.onrequest = request => this.doRequest(request);
    (socket as any)[CLIENT_UNSUBS] = [socket.onAny((event, data) => this.emit(event, data))];
  }

  protected unbind(socket: ClientSocket) {
    const unsubs = (socket as any)[CLIENT_UNSUBS];
    while (unsubs?.length) {
      unsubs.shift()();
    }
    socket.onrequest = undefined;
  }

  addRequestInterceptor(handler: InterceptionHandler<Request<ClientSocket>>) {
    this.requestInterception.add(handler);
    return this;
  }

  addRemoteInterceptor(handler: InterceptionHandler<Request<ClientSocket>>) {
    this.remoteInterception.add(handler);
    return this;
  }

  close() {
    return this.socket.close();
  }

  protected async doRequest(request: Request<ClientSocket>) {
    await this.invokeRequestInterceptors(request);
    await this.onrequest?.(request);
  }

  protected async invokeRequestInterceptors(request: Request<ClientSocket>) {
    await this.requestInterception.invoke(request);
  }
}

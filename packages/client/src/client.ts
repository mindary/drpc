import {ClientSocket, ClientSocketOptions, OnCall, OnSignal, Remote, Request} from '@remly/core';
import {Interception, InterceptionHandler} from '@remly/interception';

import 'ts-essentials';
import '@libit/interceptor';

export interface ClientOptions extends ClientSocketOptions {
  oncall?: OnCall<Client>;
  onsignal?: OnSignal<Client>;
}

export class Client extends ClientSocket {
  public remote: Remote<Client>;
  public oncall?: OnCall<Client>;
  public onsignal?: OnSignal<Client>;

  protected incomingInterception = new Interception<Request<Client>>();

  constructor(options?: Partial<ClientOptions>) {
    super(options);
  }

  addIncomingInterceptor(handler: InterceptionHandler<Request<Client>>) {
    this.incomingInterception.add(handler);
    return this;
  }

  protected async doCall(request: Request<Client>) {
    await this.invokeCallInterceptors(request);
    await this.oncall?.(request);
  }

  protected async doSignal(request: Request<Client>) {
    await this.invokeCallInterceptors(request);
    await this.onsignal?.(request);
  }

  protected async invokeCallInterceptors(request: Request<Client>) {
    await this.incomingInterception.invoke(request);
  }
}

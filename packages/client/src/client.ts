import {CallContext, ClientSocket, ClientSocketOptions, OnCall, OnSignal, Remote} from '@remly/core';
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

  protected incomingInterception = new Interception<CallContext<Client>>();

  constructor(options?: Partial<ClientOptions>) {
    super(options);
  }

  addIncomingInterceptor(handler: InterceptionHandler<CallContext<Client>>) {
    this.incomingInterception.add(handler);
    return this;
  }

  protected async doCall(context: CallContext<Client>) {
    await this.invokeCallInterceptors(context);
    await this.oncall?.(context);
  }

  protected async doSignal(context: CallContext<Client>) {
    await this.invokeCallInterceptors(context);
    await this.onsignal?.(context);
  }

  protected async invokeCallInterceptors(context: CallContext<Client>) {
    await this.incomingInterception.invoke(context);
  }
}

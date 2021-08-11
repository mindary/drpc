import {ClientSocket, ClientSocketOptions, RegistryMixin, Remote} from '@remly/core';

export interface ClientOptions extends ClientSocketOptions {}

export class Client extends RegistryMixin(ClientSocket) {
  public remote: Remote<Client>;

  constructor(options?: Partial<ClientOptions>) {
    super(options);
  }
}

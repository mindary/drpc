import {ClientSocket, ClientSocketOptions, RegistryMixin} from '@remly/core';

export interface ClientOptions extends ClientSocketOptions {}

export class Client extends RegistryMixin(ClientSocket) {
  constructor(options?: Partial<ClientOptions>) {
    super(options);
  }
}

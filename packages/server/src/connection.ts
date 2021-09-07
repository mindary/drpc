import {OnIncoming, Remote, ServerSocket, ServerSocketOptions, Transport} from '@remly/core';

export interface ConnectionOptions extends ServerSocketOptions {
  onincoming?: OnIncoming<Connection>;
}

export class Connection extends ServerSocket {
  public remote: Remote<Connection>;
  public onincoming: OnIncoming<Connection>;

  constructor(transport: Transport, options?: ConnectionOptions) {
    super(transport, options);
  }
}

import {OnRequest, Remote, ServerSocket, ServerSocketOptions, Transport} from '@remly/core';

export interface ConnectionOptions extends ServerSocketOptions {
  onincoming?: OnRequest<Connection>;
}

export class Connection extends ServerSocket {
  public remote: Remote<Connection>;
  public onincoming: OnRequest<Connection>;

  constructor(id: string, transport: Transport, options?: ConnectionOptions) {
    super(id, transport, options);
  }
}

import {OnRequest, Remote, ServerSocket, ServerSocketOptions, Transport} from '@remly/core';

export interface ConnectionOptions extends ServerSocketOptions {
  onrequest?: OnRequest<Connection>;
}

export class Connection extends ServerSocket {
  public remote: Remote<Connection>;
  public onrequest: OnRequest<Connection>;

  constructor(id: string, transport: Transport, options?: ConnectionOptions) {
    super(id, transport, options);
  }
}

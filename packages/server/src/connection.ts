import {ActionPacketType, OnIncoming, Remote, ServerSocket, ServerSocketOptions, Transport} from '@drpc/core';

export interface ConnectionOptions extends ServerSocketOptions {
  onincoming?: OnIncoming<ActionPacketType, Connection>;
}

export class Connection extends ServerSocket {
  public remote: Remote<Connection>;
  public onincoming: OnIncoming<ActionPacketType, Connection>;

  constructor(transport: Transport, options?: ConnectionOptions) {
    super(transport, options);
  }
}

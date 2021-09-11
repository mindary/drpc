import {ActionPacketType, OnIncoming, ServerSocket, ServerSocketOptions, Transport} from '@drpc/core';

export interface ConnectionOptions extends ServerSocketOptions {
  onincoming?: OnIncoming<ActionPacketType, Connection>;
}

export class Connection extends ServerSocket {
  constructor(transport: Transport, options?: ConnectionOptions) {
    super(transport, options);
  }
}

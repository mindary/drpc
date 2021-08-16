import {ServerSocket, ServerSocketOptions, Transport} from '@remly/core';

export interface ConnectionOptions extends ServerSocketOptions<Connection> {
  // oncall?: OnCall<Connection>;
  // onsignal?: OnSignal<Connection>;
}

export class Connection extends ServerSocket {
  // public remote: Remote<Connection>;
  // public oncall: OnCall<Connection>;
  // public onsignal: OnSignal<Connection>;

  constructor(id: string, transport: Transport, options?: ConnectionOptions) {
    super(id, transport, options);
  }
}

import {ServerSocket} from '@remly/core';
import {Remote} from '@remly/core';

export class Connection extends ServerSocket {
  public remote: Remote<Connection>;
}

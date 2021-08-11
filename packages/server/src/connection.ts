import {ServerSocket} from '@remly/core';
import {Remote} from '@remly/core';

export class Connection extends ServerSocket {
  public remote: Remote<Connection>;
  /**
   * Additional information that can be attached to the Connection instance and which will be used in DTO/Persistent
   */
  public data: Record<string, any> = {};
}

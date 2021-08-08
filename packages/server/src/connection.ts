import {ServerSocket} from '@remly/core';

export class Connection extends ServerSocket {
  /**
   * Additional information that can be attached to the Connection instance and which will be used in DTO/Persistent
   */
  public data: Record<string, any> = {};
}

import {ServerSocket} from '@remly/core';

export class Connection extends ServerSocket {
  public data: Record<string, any> = {};
}

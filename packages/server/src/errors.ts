import {BaseError} from 'make-error-cause';
import {Connection} from '@remly/core';

export class ConnectionError extends BaseError {
  constructor(public connection: Connection, cause?: Error) {
    super(cause?.message, cause);
  }
}

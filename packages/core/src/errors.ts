import {Exception} from '@libit/error/exception';
import {ErrorLike, isErrorLike} from '@libit/error/types';

export enum ErrorCode {
  /**
   * Invalid method parameter(s).
   */
  INVALID_PARAMS = 3,

  /**
   * The method does not exist / is not available.
   */
  UNIMPLEMENTED = 12,

  /**
   * Internal RPC error.
   */
  INTERNAL_ERROR = 13,

  /**
   * Reserved for implementation-defined server-errors.
   */
  UNKNOWN = 2,
}

export const ErrorMessages: Record<ErrorCode, string> = {
  [ErrorCode.UNIMPLEMENTED]: 'Method not found',
  [ErrorCode.INVALID_PARAMS]: 'Invalid params',
  [ErrorCode.INTERNAL_ERROR]: 'Internal error',
  [ErrorCode.UNKNOWN]: 'Unknown error',
};

export class TimeoutError extends Exception {
  code = 'TIMEOUT';
}

export class ConnectTimeoutError extends TimeoutError {
  code = 'CONNECT_TIMEOUT';
}

export class ConnectionStallError extends Exception {
  code = 'CONNECTION_STALL';
}

export class InvalidPayloadError extends Exception {
  code = 'INVALID_PAYLOAD';

  constructor(message?: string) {
    super(message);
  }
}

export class RemoteError extends Exception {
  code: number;
  data?: any;

  constructor(cause: ErrorLike, data?: any);
  constructor(code?: number, message?: string, data?: any);
  constructor(code?: any, message?: any, data?: any) {
    super();
    if (isErrorLike(code)) {
      data = message;
      if (typeof code === 'string') {
        message = code;
        code = undefined;
      } else {
        message = code.message;
        code = (code as any).code;
      }
      code = code ?? ErrorCode.INTERNAL_ERROR;
    }
    this.code = code;
    this.message = message ?? ErrorMessages[<ErrorCode>this.code] ?? ErrorMessages[ErrorCode.UNKNOWN];
    this.data = data;
  }
}

export class UnimplementedError extends RemoteError {
  constructor(message?: string, data?: any) {
    super(ErrorCode.UNIMPLEMENTED, message, data);
  }
}

export class InvalidParamsError extends RemoteError {
  constructor(message?: string, data?: any) {
    super(ErrorCode.INVALID_PARAMS, message, data);
  }
}

export class InternalError extends RemoteError {
  constructor(message?: string, data?: any) {
    super(ErrorCode.INTERNAL_ERROR, message, data);
  }
}

export class UnknownError extends RemoteError {
  constructor(message?: string, data?: any) {
    super(ErrorCode.UNKNOWN, message, data);
  }
}

export function makeRemoteError(source: any): RemoteError {
  if (!source) {
    return new InternalError();
  }

  if (typeof source === 'object') {
    return new RemoteError(source);
  }

  return new InternalError(undefined, source);
}

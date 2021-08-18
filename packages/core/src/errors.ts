import {Exception} from '@libit/error/exception';
import {ErrorLike, isErrorLike} from '@libit/error/types';

export enum ErrorCode {
  /**
   * Reserved for implementation-defined server-errors.
   */
  UNKNOWN = 2,

  CONNECT_TIMEOUT = 11,

  CONNECTION_STALL = 12,

  INVALID_PAYLOAD = 13,

  /**
   * Invalid method parameter(s).
   */
  INVALID_PARAMS = 21,

  /**
   * The method does not exist / is not available.
   */
  UNIMPLEMENTED = 22,

  CALL_TIMEOUT = 23,

  /**
   * Internal Rpc error.
   */
  INTERNAL_ERROR = 24,
}

export const ErrorMessages: Record<ErrorCode, string> = {
  [ErrorCode.UNKNOWN]: 'Unknown error',
  [ErrorCode.CONNECT_TIMEOUT]: 'Connect timeout',
  [ErrorCode.CONNECTION_STALL]: 'Connection stall',
  [ErrorCode.INVALID_PAYLOAD]: 'Invalid payload',
  [ErrorCode.UNIMPLEMENTED]: 'Method not found',
  [ErrorCode.INVALID_PARAMS]: 'Invalid args',
  [ErrorCode.CALL_TIMEOUT]: 'Call timeout',
  [ErrorCode.INTERNAL_ERROR]: 'Internal error',
};

export class RemoteError extends Exception {
  code: number;
  payload?: any;

  constructor(cause: ErrorLike, payload?: any);
  constructor(code?: number, message?: string, payload?: any);
  constructor(code?: any, message?: any, payload?: any) {
    super();
    if (isErrorLike(code)) {
      payload = message;
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
    this.payload = payload;
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      payload: this.payload,
    };
  }
}

export class ConnectTimeoutError extends RemoteError {
  code = ErrorCode.CONNECT_TIMEOUT;
}

export class ConnectionStallError extends RemoteError {
  code = ErrorCode.CONNECTION_STALL;
}

export class InvalidPayloadError extends RemoteError {
  code = ErrorCode.INVALID_PAYLOAD;
}

export class UnimplementedError extends RemoteError {
  code = ErrorCode.UNIMPLEMENTED;
}

export class InvalidParamsError extends RemoteError {
  code = ErrorCode.INVALID_PARAMS;
}

export class CallTimeoutError extends RemoteError {
  code = ErrorCode.CALL_TIMEOUT;
}

export class InternalError extends RemoteError {
  code: ErrorCode.INTERNAL_ERROR;
}

export class UnknownError extends RemoteError {
  code: ErrorCode.UNKNOWN;
}

export function makeRemoteError(source: any): RemoteError {
  if (!source) {
    return new InternalError();
  }

  if (isRemoteError(source)) {
    return source;
  }

  if (typeof source === 'object') {
    return new RemoteError(source);
  }

  return new InternalError(source);
}

export function isRemoteError(x: object): x is RemoteError {
  return x && 'code' in x && 'message' in x;
}

import {Exception} from '@libit/error/exception';
import {ErrorLike} from '@libit/error/types';

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
  #payload?: any;

  constructor(cause: ErrorLike);
  constructor(code: number, cause?: ErrorLike);
  constructor(code: number | ErrorLike, cause?: ErrorLike) {
    super();
    let message: string | undefined;
    if (typeof code !== 'number') {
      cause = code;
      code = ErrorCode.UNKNOWN;
    }

    code = code ?? (cause as any)?.code;
    if (typeof code !== 'number') {
      code = ErrorCode.INTERNAL_ERROR;
    }

    if (typeof cause === 'string') {
      message = cause;
    } else if (cause) {
      message = cause.message;
    }

    message = message ?? ErrorMessages[<ErrorCode>code] ?? ErrorMessages[ErrorCode.UNKNOWN];

    this.code = code;
    this.message = message;
  }

  getPayload() {
    return this.#payload;
  }

  payload(payload: any) {
    this.#payload = payload;
    return this;
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      payload: this.#payload,
    };
  }
}

export class ConnectTimeoutError extends RemoteError {
  constructor(cause?: ErrorLike) {
    super(ErrorCode.CONNECT_TIMEOUT, cause);
  }
}

export class ConnectionStallError extends RemoteError {
  constructor(cause?: ErrorLike) {
    super(ErrorCode.CONNECTION_STALL, cause);
  }
}

export class InvalidPayloadError extends RemoteError {
  constructor(cause?: ErrorLike) {
    super(ErrorCode.INVALID_PAYLOAD, cause);
  }
}

export class UnimplementedError extends RemoteError {
  constructor(cause?: ErrorLike) {
    super(ErrorCode.UNIMPLEMENTED, cause);
  }
}

export class InvalidParamsError extends RemoteError {
  constructor(cause?: ErrorLike) {
    super(ErrorCode.INVALID_PARAMS, cause);
  }
}

export class CallTimeoutError extends RemoteError {
  constructor(cause?: ErrorLike) {
    super(ErrorCode.CALL_TIMEOUT, cause);
  }
}

export class InternalError extends RemoteError {
  constructor(cause?: ErrorLike) {
    super(ErrorCode.INTERNAL_ERROR, cause);
  }
}

export class UnknownError extends RemoteError {
  constructor(cause?: ErrorLike) {
    super(ErrorCode.UNKNOWN, cause);
  }
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

import {ErrorCode, ErrorMessages} from './error-code';

export class TimeoutError extends Error {}

export interface RemErrorOptions {
  code?: number;
  message?: string;
  data?: any;
}

export class RemError extends Error {
  code: number;
  message: string;
  data?: any;

  constructor(opts: RemErrorOptions) {
    super();
    this.code = opts.code ?? ErrorCode.INTERNAL_ERROR;
    this.message = opts.message ?? ErrorMessages[<ErrorCode>this.code] ?? ErrorMessages[ErrorCode.UNKNOWN];
    this.data = opts.data;
  }
}

export class UnimplementedError extends RemError {
  constructor(opts?: RemErrorOptions) {
    super({
      ...opts,
      code: ErrorCode.UNIMPLEMENTED,
    });
  }
}

export class InvalidParamsError extends RemError {
  constructor(opts?: RemErrorOptions) {
    super({
      ...opts,
      code: ErrorCode.INVALID_PARAMS,
    });
  }
}

export class InternalError extends RemError {
  constructor(opts?: RemErrorOptions) {
    super({
      ...opts,
      code: ErrorCode.INTERNAL_ERROR,
    });
  }
}

export class UnknownError extends RemError {
  constructor(opts?: RemErrorOptions) {
    super({
      ...opts,
      code: ErrorCode.UNKNOWN,
    });
  }
}

export function makeRemError(source: any): RemError {
  if (!source) {
    return new InternalError();
  }

  if (typeof source === 'object') {
    return new RemError(source);
  }

  return new InternalError({data: source});
}

export interface FailureError<C extends number = number> {
  code: C;
  message: string;
  data?: any;
}

export interface SuccessMessage {
  jsonrpc: '2.0';
  result: any;
  id: number | string | null;
}

export interface FailureMessage<C extends number = number> {
  jsonrpc: '2.0';
  error: FailureError<C>;
  id: number | string | null;
}

export type ResponseMessage = SuccessMessage | FailureMessage;

function isId(a: any): boolean {
  return typeof a === 'number' || typeof a === 'string' || a === null;
}

export function isResponse(a: any): a is ResponseMessage {
  return isSuccess(a) || isFailure(a);
}

export function isSuccess(a: any): a is SuccessMessage {
  return a && a.jsonrpc === '2.0' && 'result' in a && isId(a.id);
}

export function isFailure(a: any): a is FailureMessage {
  return a && a.jsonrpc === '2.0' && isFailureError(a.error);
}

export function isFailureError(a: any): a is FailureError {
  return a && typeof a.code === 'number' && typeof a.message === 'string';
}

export function makeSuccess(
  result: any,
  id: string | number | null = null,
): SuccessMessage {
  return {jsonrpc: '2.0', result, id};
}

export function makeFailure<C extends number = number>(
  error: FailureError<C>,
  id: string | number | null = null,
): FailureMessage<C> {
  return {jsonrpc: '2.0', error, id};
}

export function makeFailureError<C extends number = number>(
  code: C,
  message: string,
  data?: any,
): FailureError<C> {
  return {code, message, ...(data !== undefined ? {data} : {})};
}

export function buildFailureErrorFactory<C extends number = number>(
  code: C,
  defaultMessage: string,
) {
  return (data?: any, message: string = defaultMessage) =>
    makeFailureError(code, message, data);
}

export function buildFailureErrorValidatorWithCode<C extends number = number>(
  code: C,
) {
  return (e: any): e is FailureError<C> => isFailureError(e) && e.code === code;
}

export interface FailureErrorMaker {
  (data?: any, message?: string): FailureError;
}

export interface FailureErrorValidator<C extends number = number> {
  (e: any): e is FailureError<C>;
}

// ----------------------------------------------------------------------------
// Defined Failure Errors
// ----------------------------------------------------------------------------
export const PARSE_ERROR = -32700;
export const INVALID_REQUEST_ERROR = -32600;
export const METHOD_NOT_FOUND_ERROR = -32601;
export const INVALID_PARAMS_ERROR = -32602;
export const INTERNAL_ERROR = -32603;

export type ParseError = FailureError<typeof PARSE_ERROR>;
export type InvalidRequestError = FailureError<typeof INVALID_REQUEST_ERROR>;
export type MethodNotFoundError = FailureError<typeof METHOD_NOT_FOUND_ERROR>;
export type InvalidParamsError = FailureError<typeof INVALID_PARAMS_ERROR>;
export type InternalError = FailureError<typeof INTERNAL_ERROR>;

export const makeParseError: FailureErrorMaker = buildFailureErrorFactory(
  PARSE_ERROR,
  'Parse error',
);
export const makeInvalidRequestError: FailureErrorMaker = buildFailureErrorFactory(
  INVALID_REQUEST_ERROR,
  'Invalid request',
);
export const makeMethodNotFoundError: FailureErrorMaker = buildFailureErrorFactory(
  METHOD_NOT_FOUND_ERROR,
  'Method not found',
);
export const makeInvalidParamsError: FailureErrorMaker = buildFailureErrorFactory(
  INVALID_PARAMS_ERROR,
  'Invalid params',
);
export const makeInternalError: FailureErrorMaker = buildFailureErrorFactory(
  INTERNAL_ERROR,
  'Internal error',
);

export const isParseError: FailureErrorValidator = buildFailureErrorValidatorWithCode(
  PARSE_ERROR,
);
export const isInvalidRequestError: FailureErrorValidator = buildFailureErrorValidatorWithCode(
  INVALID_REQUEST_ERROR,
);
export const isMethodNotFoundError: FailureErrorValidator = buildFailureErrorValidatorWithCode(
  METHOD_NOT_FOUND_ERROR,
);
export const isInvalidParamsError: FailureErrorValidator = buildFailureErrorValidatorWithCode(
  INVALID_PARAMS_ERROR,
);
export const isInternalError: FailureErrorValidator = buildFailureErrorValidatorWithCode(
  INTERNAL_ERROR,
);

export function makeFailureErrorFrom(error: any): FailureError {
  if (isFailureError(error)) {
    return makeFailureError(error.code, error.message, error.data);
  }

  if (typeof error === 'object' && error.stack) {
    const props = Object.getOwnPropertyNames(error)
      .filter(k => k !== 'stack')
      .reduce((memo, key) => ({...memo, [key]: error[key]}), {
        name: error.name,
      });

    return makeInternalError(props);
  }

  return makeInternalError(error);
}

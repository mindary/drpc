// eslint-disable-next-line no-shadow
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

export type RequestParams = any[] | object;

export interface RequestMessage {
  jsonrpc: '2.0';
  method: string;
  params?: RequestParams;
  id?: string | number;
}

export interface SignalMessage extends RequestMessage {
  id?: never;
}

function isId(a: any): boolean {
  return typeof a === 'number' || typeof a === 'string' || a === undefined;
}

export function isRequest(a: any): a is RequestMessage {
  if (!a) return false;
  if (a.jsonrpc !== '2.0') return false;
  if (typeof a.method !== 'string') return false;
  return isId(a.id);
}

export function isSignal(a: any): a is SignalMessage {
  return isRequest(a) && a.id === undefined;
}

export function makeRequest(
  method: string,
  params?: any[] | object,
  id?: string | number,
): RequestMessage {
  return {
    jsonrpc: '2.0',
    method,
    ...(params !== undefined ? {params} : {}),
    ...(id !== undefined ? {id} : {}),
  };
}

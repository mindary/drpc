export type EncodeFunc = (input: any) => any;
export type DecodeFunc = (input: any) => any;

export interface Constructor<T> {
  new (...args: any[]): T;
}

export interface Codec<T> {
  clazz: Constructor<T>;
  encode: (input: T, encode?: EncodeFunc) => any;
  decode: (input: any, decode?: DecodeFunc) => T;
}

export function isCodec(arg: any): arg is Codec<any> {
  return arg.clazz != null;
}

export interface Framer<T> {
  register(...codecs: T[]): void;

  encode(input: any): Buffer;

  decode(input: Buffer | Uint8Array | number[]): any;
}

export interface TransportContext {
  [name: string]: any;
}

export interface Dispatcher {
  (message: any, context?: TransportContext): Promise<any>;
}

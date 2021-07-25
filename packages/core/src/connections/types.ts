import {Serializer} from '@remly/serializer';
import {Parser} from '../parsers';
import {InvokeFn} from '../types';
import {Registry} from '../registry';

export interface ConnectionOptions {
  id?: string;

  parser?: Parser;
  serializer?: Serializer;

  interval?: number;
  keepalive?: number;
  requestTimeout?: number;
  pingTimeout?: number;
  connectTimeout?: number;

  invoke?: InvokeFn;
}

export interface ConnectionWithRegistryOptions extends ConnectionOptions {
  registry?: Registry;
}

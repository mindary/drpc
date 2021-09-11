import {ValueOrPromise} from '@drpc/types';
import {Metadata} from '@drpc/packet';
import {InterceptContext, Next} from '@libit/interceptor';
import {Socket} from './sockets';
import {Carrier} from './carrier';
import {Request} from './request';

// export type MetadataLike = Record<string, string | Buffer> | Metadata;

export interface CallOptions {
  timeout?: number;
}

export interface Callable {
  call(name: string, args?: any[], options?: CallOptions): Promise<any>;
  call(name: string, args?: any[], metadata?: Metadata, options?: CallOptions): Promise<any>;
}

export interface NetAddress {
  readonly localAddress: string;
  readonly localPort: number;
  readonly remoteFamily?: string;
  readonly remoteAddress?: string;
  readonly remotePort?: number;
}

export type IOInterceptor<C extends InterceptContext = InterceptContext, T = any> = (
  context: C,
  next: Next,
) => ValueOrPromise<T>;

export type ActionPacketType = 'event' | 'call';

// return true for continue authentication, false for finish authentication
export type OnAuth<S extends Socket = any, T = void> = (carrier: Carrier<'auth', S>) => ValueOrPromise<T>;

export type OnIncoming<P extends ActionPacketType = ActionPacketType, S extends Socket = any, T = any> = IOInterceptor<
  Carrier<P, S>,
  T
>;

export type OnOutgoing<P extends ActionPacketType = ActionPacketType, S extends Socket = any, T = any> = IOInterceptor<
  Request<P, S>,
  T
>;

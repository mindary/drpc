import {ValueOrPromise} from '@drpc/types';
import {GenericInterceptor, GenericInterceptorChain, Next} from '@libit/interceptor';

export type InterceptionHandler<CONTEXT> = GenericInterceptor<CONTEXT>;
export type InvocationResult = any;

export class Interception<CTX = any, T = InvocationResult> {
  handlers: InterceptionHandler<CTX>[] = [];

  add(handler: InterceptionHandler<CTX>) {
    this.handlers.push(handler);
  }

  invoke(request: CTX, finalHandler?: Next): ValueOrPromise<T | undefined> {
    return new GenericInterceptorChain(request, this.handlers).invokeInterceptors(finalHandler);
  }
}

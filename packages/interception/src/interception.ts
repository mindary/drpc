import {GenericInterceptor, GenericInterceptorChain, Next} from '@libit/interceptor';

export type InterceptionHandler<CONTEXT> = GenericInterceptor<CONTEXT>;

export class Interception<C> {
  handlers: InterceptionHandler<C>[] = [];

  add(handler: InterceptionHandler<C>) {
    this.handlers.push(handler);
  }

  invoke(request: C, finalHandler?: Next) {
    return new GenericInterceptorChain(request, this.handlers).invokeInterceptors(finalHandler);
  }
}

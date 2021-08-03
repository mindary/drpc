import {MixinTarget} from '../mixin-target';
import {Service, RemoteService} from '../remote-service';
import {Callable} from '../types';

export function RemoveServiceMixin<T extends MixinTarget<Callable>>(superClass: T) {
  return class extends superClass {
    service<S extends Service>(namespace?: string): RemoteService<S> {
      return new RemoteService<Service>(this, namespace);
    }
  };
}

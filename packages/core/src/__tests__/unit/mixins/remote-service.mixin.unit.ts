import {ValueOrPromise} from '@remly/types';
import {expect} from '@loopback/testlab';
import {PickProperties} from 'ts-essentials';
import {RegistryMixin, RemoveServiceMixin} from '../../../mixins';
import {Monster, monster} from '../../fixtures/monster';

describe('RemoteServiceMixin', function () {
  it('mixed class has .service()', function () {
    const broker = new BrokerWithRemoteService();
    expect(broker.service).type('function');
  });

  it('can work with remote service', async () => {
    const broker = new BrokerWithRemoteService();
    broker.register(monster);
    const service = broker.service<PickProperties<Monster, Function>>();
    expect(await service.call('add', [1, 2])).equal(3);
  });

  class Broker extends RegistryMixin(Object) {
    call(name: string, params?: any[], timeout?: number): ValueOrPromise<any> {
      return this.registry.call(name, params);
    }
  }

  class BrokerWithRemoteService extends RemoveServiceMixin(Broker) {}
});

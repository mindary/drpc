import {expect} from '@loopback/testlab';
import {RegistryMixin} from '../../../mixins';
import {monster} from '../../fixtures/monster.service';

describe('RegistryMixin', () => {
  it('mixed class has .register() and .unregister()', function () {
    const obj = new ObjectWithRegistry();
    expect(obj.register).type('function');
    expect(obj.unregister).type('function');
  });

  it('mixed class has .registry and .invoke()', function () {
    const obj = new ObjectWithRegistry();
    expect(obj.registry).type('object');
    expect(obj.invoke).type('function');
  });

  it('register server and can invoke method', async () => {
    const obj = new ObjectWithRegistry();
    obj.register(monster);
    // eslint-disable-next-line no-void
    const result = await new Promise(resolve => void obj.invoke('add', [1, 2], resolve));
    expect(result).equal(3);
  });

  class ObjectWithRegistry extends RegistryMixin(Object) {}
});

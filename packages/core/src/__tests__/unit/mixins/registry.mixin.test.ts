import {expect} from '@loopback/testlab';
import {OnIncoming} from '../../..';
import {RegistryMixin} from '../../../mixins';
import {monster} from '../../fixtures/monster.service';

describe('RegistryMixin', () => {
  it('mixed class has .register() and .unregister()', function () {
    const app = new ApplicationWithRegistry();
    expect(app.register).type('function');
    expect(app.unregister).type('function');
  });

  it('mixed class has .registry and .invoke()', function () {
    const app = new ApplicationWithRegistry();
    expect(app.registry).type('object');
    expect(app.onincoming).type('function');
  });

  it('register server and can invoke method', async () => {
    const app = new ApplicationWithRegistry();
    app.register(monster);
    const result = await app.invokeWithRegistry({name: 'add', params: [1, 2]});
    expect(result).equal(3);
  });

  class Application {
    onincoming: OnIncoming;
  }

  class ApplicationWithRegistry extends RegistryMixin(Application) {}
});

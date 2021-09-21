import {OnIncoming} from '@drpc/core';
import {expect} from '@loopback/testlab';
import {monster, makeCallRequest} from '@drpc/testlab';
import {RegistryMixin} from '../../mixins';

class Application {
  onincoming: OnIncoming;
}

class ApplicationWithRegistry extends RegistryMixin(Application) {}

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
    const result = await app.invokeWithRequest(makeCallRequest(1, 'add', [1, 2]));
    expect(result).equal(3);
  });

  it('invoke rpc method with injected request', async () => {
    const app = new ApplicationWithRegistry();
    app.register(monster);
    const result = await app.invokeWithRequest(makeCallRequest(2, 'getRequestIdFromRequest'));
    expect(result).equal(2);
  });

  it('invoke rpc method with injected response', async () => {
    const app = new ApplicationWithRegistry();
    app.register(monster);
    const result = await app.invokeWithRequest(makeCallRequest(3, 'getRequestIdFromResponse'));
    expect(result).equal(3);
  });
});

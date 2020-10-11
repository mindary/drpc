import {noop} from 'ts-essentials';
import {expect} from '@tib/testlab';
import {DefaultRegistry} from '../registry';
import {createNoop} from './support';
import {monster} from './mocks/monster';
import {protoKeys} from '../utils';
import {Method} from '../method';
import {UnimplementedError} from '../error';

const fn1 = createNoop();
const fn2 = createNoop();

describe('registry', function () {
  describe('register', function () {
    describe('single method', function () {
      it('should register for single method', function () {
        const registry = new DefaultRegistry();
        registry.register('add', noop);
        expect(registry.methods).have.key('add');
      });

      it('should throw error if method already bound', function () {
        const registry = new DefaultRegistry();
        registry.register('add', fn1);
        expect(registry.methods['add']).containDeep({
          handler: fn1,
          scope: undefined,
        });
        expect(() => registry.register('add', fn2)).throw(/Method already bound/);
      });

      it('should register with namespace parameter', function () {
        const registry = new DefaultRegistry();
        registry.register('add', noop, {namespace: 'monster'});
        expect(registry.methods).have.key('monster.add');
      });
    });

    describe('service', function () {
      it('should register a service with all methods', function () {
        const keys = protoKeys(monster).filter(k => typeof (monster as any)[k] === 'function');
        const registry = new DefaultRegistry();
        registry.register(monster);
        expect(Object.keys(registry.methods)).deepEqual(keys);
        // assert monster
        Object.values(registry.methods).forEach(m => expect(m.scope).equal(monster));
      });

      it('should register a service with specified methods', function () {
        const keys = ['add', 'addSlow'];
        const registry = new DefaultRegistry();
        registry.register(monster, keys);
        expect(Object.keys(registry.methods)).deepEqual(keys);
      });

      it('should register with namespace parameter', function () {
        const registry = new DefaultRegistry();
        registry.register(monster, {namespace: 'monster'});
        expect(registry.methods).have.key('monster.add');
      });
    });
  });

  describe('get', function () {
    it('should get method successful', function () {
      const registry = new DefaultRegistry();
      registry.register(monster);
      expect(registry.get('add')).instanceOf(Method);
    });

    it('should throw error for unknown method', function () {
      const registry = new DefaultRegistry();
      registry.register(monster);
      expect(() => registry.get('__unknown_method')).throw(UnimplementedError);
    });

    it('should get for namespace', function () {
      const registry = new DefaultRegistry();
      registry.register(monster, {namespace: 'monster'});
      expect(registry.methods).have.key('monster.add');
    });
  });

  describe('unregister', function () {
    it('should unregister with one exact name', function () {
      const registry = new DefaultRegistry();
      registry.register(monster);
      expect(registry.methods).have.key('add');
      expect(registry.methods).have.key('addSlow');

      registry.unregister('add');
      expect(registry.methods).not.have.key('add');
      expect(registry.methods).have.key('addSlow');
    });

    it('should unregister with multiple exact names', function () {
      const registry = new DefaultRegistry();
      registry.register(monster);
      expect(registry.methods).have.key('add');
      expect(registry.methods).have.key('addSlow');

      registry.unregister(['add', 'addSlow']);
      expect(registry.methods).not.have.key('add');
      expect(registry.methods).not.have.key('addSlow');
    });

    it('should unregister with pattern', function () {
      const registry = new DefaultRegistry();
      registry.register(monster);
      expect(registry.methods).have.key('add');
      expect(registry.methods).have.key('addSlow');

      registry.unregister('add*');
      expect(registry.methods).not.have.key('add');
      expect(registry.methods).not.have.key('addSlow');
    });
  });

  describe('invoke', function () {
    it('should work', async function () {
      const registry = new DefaultRegistry();
      registry.register(monster);
      const result = await registry.invoke('add', [1, 2]);
      expect(result).equal(3);
    });

    it('should invoke with service as scope', async function () {
      const registry = new DefaultRegistry();
      registry.register(monster);
      const result = await registry.invoke('greet', 'Tom');
      expect(result).equal('Hello Tom');
    });

    it('should invoke with custom scope', async function () {
      const scope = {
        prefix: '您好',
      };
      const registry = new DefaultRegistry();
      registry.register(monster, {scope});
      const result = await registry.invoke('greet', 'Tom');
      expect(result).equal('您好 Tom');
    });
  });
});

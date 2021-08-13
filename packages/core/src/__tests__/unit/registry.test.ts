import {expect} from '@loopback/testlab';
import {DefaultRegistry} from '../../registry';
import {monster, MonsterService} from '../fixtures/monster.service';
import {protoKeys} from '../../utils';
import {Method} from '../../method';
import {UnimplementedError} from '../../errors';
import {Monster} from '../fixtures/monster.definition';
import {getAllRPCMethodMetadata} from '../../decorators';

describe('registry', function () {
  describe('register', function () {
    describe('service', function () {
      it('should only register decorated methods', function () {
        const keys = Object.keys(getAllRPCMethodMetadata(MonsterService) ?? {});
        const registry = new DefaultRegistry();
        registry.register(monster);
        expect(Object.keys(registry.methods)).deepEqual(keys);
        // assert monster
        Object.values(registry.methods).forEach(m => expect(m.scope).equal(monster));
      });

      it('should register a service with all methods with wildcard', function () {
        const keys = protoKeys(monster).filter(k => typeof (monster as any)[k] === 'function');
        const registry = new DefaultRegistry();
        registry.register(monster, '*');
        expect(Object.keys(registry.methods)).deepEqual(keys);
        // assert monster
        Object.values(registry.methods).forEach(m => expect(m.scope).equal(monster));
      });

      it('should register extra methods if specified', function () {
        const keys = ['extraMethod1'];
        const r1 = new DefaultRegistry();
        r1.register(monster);
        expect(Object.keys(r1.methods)).not.containDeep(keys);

        const r2 = new DefaultRegistry();
        r2.register(monster, keys);
        expect(Object.keys(r2.methods)).containDeep(keys);
      });

      it('should register with namespace parameter', function () {
        const registry = new DefaultRegistry();
        registry.register(Monster.name, monster);
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
      registry.register(Monster.name, monster);
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

  describe('call', function () {
    it('should work', async function () {
      const registry = new DefaultRegistry();
      registry.register(monster);
      const result = await registry.call('add', [1, 2]);
      expect(result).equal(3);
    });

    it('should call with service as scope', async function () {
      const registry = new DefaultRegistry();
      registry.register(monster);
      const result = await registry.call('greet', 'Tom');
      expect(result).equal('Hello Tom');
    });

    it('should call with custom scope', async function () {
      const scope = {
        prefix: '您好',
      };
      const registry = new DefaultRegistry();
      registry.register(monster, scope);
      const result = await registry.call('greet', 'Tom');
      expect(result).equal('您好 Tom');
    });
  });
});

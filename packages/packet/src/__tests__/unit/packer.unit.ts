import {expect} from '@loopback/testlab';
import {packer} from '../../packer';
import {Metadata} from '../../metadata';
import {PacketType} from '../../types';
import {MessageTypes} from '../../packet';

describe('Packer', function () {
  it('pack fail with invalid packet type', function () {
    expect(() => packer.pack('invalid_type' as any, {name: 'event'})).throw(/Unknown packet type/);
  });

  it('unpack fail with invalid check sum', function () {
    const encoded = packer.pack('signal', {name: 'event'});
    // 5~8 for check num
    encoded[6] = ~encoded[6];
    expect(() => packer.unpack(encoded)).throw(/Checksum dose not match/);
  });

  it('unpack fail with invalid packet type', function () {
    const encoded = packer.pack('signal', {name: 'event'});
    encoded[0] = 0xff;
    expect(() => packer.unpack(encoded)).throw(/Unknown packet type/);
  });

  describe('packets', function () {
    testPackUnpack(
      'connect',
      {
        protocolId: 'remly',
        protocolVersion: 1,
        keepalive: 30,
        clientId: 'test',
      },
      {
        auth: 'test:test',
      },
    );

    testPackUnpack(
      'ping',
      {
        payload: 'hello',
      },
      {
        ts: new Date().toString(),
      },
    );

    testPackUnpack(
      'pong',
      {
        payload: 'hello',
      },
      {
        ts: new Date().toString(),
      },
    );

    testPackUnpack('signal', {
      name: 'message',
      payload: 'The door is open',
    });

    testPackUnpack(
      'call',
      {
        id: 1,
        name: 'greet',
        payload: '张三',
      },
      {
        foo: 'bar',
        nums: ['1', '2'],
      },
    );

    testPackUnpack(
      'ack',
      {
        id: 1,
        payload: {
          result: '你好, 张三！',
        },
      },
      {},
    );

    testPackUnpack('error', {
      id: 1,
      code: 1000,
      message: '错误',
    });
  });
});

function testPackUnpack<T extends PacketType>(type: T, message: MessageTypes[T], metadata?: any) {
  it(`${type} packet`, function () {
    metadata = Metadata.from(metadata);
    const packet = {type, metadata, message};
    const encoded = packer.pack(type as any, message, metadata);
    const decoded = packer.unpack(encoded);
    expect(decoded).eql(packet);
  });
}

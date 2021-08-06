import {expect} from '@loopback/testlab';
import {PacketTypeType} from '../../packet-types';
import {PacketMessages} from '../../messages';
import {Packet} from '../../packet';
import {nonce} from '../../utils';

const CASES: {
  [p in keyof PacketTypeType]: PacketMessages[p];
} = {
  open: {
    sid: 'abcdef',
    keepalive: 10 * 1000,
    challenge: nonce(),
  },
  ping: {
    payload: Buffer.from('12345678'),
  },
  pong: {
    payload: Buffer.from('12345678'),
  },
  connect: {
    payload: Buffer.from('{"token": "12345678"}'),
  },
  connect_error: {
    code: 'INVALID_TOKEN',
    message: '非法令牌',
  },
  call: {
    id: 1001,
    name: 'echo',
    payload: Buffer.from('Hello World'),
  },
  ack: {
    id: 1001,
    payload: Buffer.from('Hi, Hello World'),
  },
  error: {
    id: 1001,
    code: 3,
    message: '参数错误',
    payload: Buffer.from(''),
  },
  signal: {
    name: 'greeting',
    payload: Buffer.from('Hello'),
  },
};

describe('Packet', function () {
  Object.entries(CASES).forEach(([type, message]) => {
    it(`${type} packet`, function () {
      const packet = Packet.create(type as any, message);
      const frame = packet.frame();
      expect(Packet.fromRaw(frame).message).eql(message);
    });
  });
});

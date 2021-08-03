import {expect} from '@loopback/testlab';
import {MsgpackSerializer} from '../msgpack.serializer';
import {json1} from './fixtures';

const EMPTY_BUFFER = Buffer.allocUnsafe(0);

describe('serializer/msgpack', function () {
  const serializer = new MsgpackSerializer();

  it('should serialize and deserialize json object', function () {
    const obj = json1;
    const encoded = serializer.serialize(obj);
    const decoded = serializer.deserialize(encoded);
    expect(decoded).deepEqual(obj);
  });

  it('should serialize and deserialize undefined and null', function () {
    const encodedNull = serializer.serialize(null);
    const encodedUndefined = serializer.serialize(undefined);
    const decodedNull = serializer.deserialize(encodedNull);
    const decodedUndefined = serializer.deserialize(encodedUndefined);
    expect(decodedNull).equal(null);
    expect(decodedUndefined).equal(null);
  });
});

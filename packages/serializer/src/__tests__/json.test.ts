import {expect} from '@loopback/testlab';
import {JsonSerializer} from '../json.serializer';

describe('serializer/json', function () {
  const serializer = new JsonSerializer();

  it('should work', function () {
    const obj = {foo: 'bar'};
    const encoded = serializer.serialize(obj);
    const decoded = serializer.deserialize(encoded);
    expect(encoded).deepEqual(Buffer.from(JSON.stringify(obj)));
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

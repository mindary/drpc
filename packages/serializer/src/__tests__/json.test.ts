import {expect} from '@tib/testlab';
import {JsonSerializer} from '../json.serializer';

describe('serializer/json', function () {
  it('should work', function () {
    const obj = {foo: 'bar'};
    const serializer = new JsonSerializer();
    const encoded = serializer.serialize(obj);
    const decoded = serializer.deserialize(encoded);
    expect(encoded).deepEqual(Buffer.from(JSON.stringify(obj)));
    expect(decoded).deepEqual(obj);
  });
});

import {expect} from '@tib/testlab';
import {MsgpackSerializer} from '../msgpack.serializer';
import {json1} from './fixtures';

describe('serializer/msgpack', function () {
  it('should work', function () {
    const obj = json1;
    const serializer = new MsgpackSerializer();
    const encoded = serializer.serialize(obj);
    const decoded = serializer.deserialize(encoded);
    expect(decoded).deepEqual(obj);
  });
});

import {randomBytes} from 'crypto';
import {crc32} from '../../crc32';
import {expect} from '@loopback/testlab';

describe('crc32', function () {
  it('calc with offset', function () {
    const data = randomBytes(1024);
    const sum = crc32(data.slice(10));
    expect(crc32(data, 10)).deepEqual(sum);
  });
});

import {expect} from '@loopback/testlab';
import {isBrowser} from '../../utils';

describe('utils', function () {
  it('should isBrowser', function () {
    // node environment
    expect(isBrowser).false();
  });
});

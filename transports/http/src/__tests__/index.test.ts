import {expect} from '@tib/testlab';
import {add} from '..';

describe('testing add function', () => {
  it('5 + 6 = 11', () => {
    expect(add(5, 6)).equal(11);
  });
});

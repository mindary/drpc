import {expect} from '@loopback/testlab';
import {ThreadWorker} from '../client';

describe('ThreadWorker', function () {
  it('should be class', function () {
    expect(ThreadWorker).type('function');
  });
});

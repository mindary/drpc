import {expect, sinon} from '@loopback/testlab';
import {SinonStub} from 'sinon';
import {rawLength} from '../../utils';

describe('utils', function () {
  let stubConsoleError: SinonStub;

  beforeEach(() => {
    stubConsoleError = sinon.stub(console, 'error');
  });

  afterEach(() => {
    stubConsoleError?.restore();
  });

  describe('rawLength', function () {
    it('should work', function () {
      expect(rawLength()).equal(0);
      expect(rawLength([1, 2])).equal(2);
      expect(rawLength(Buffer.from([1, 2]))).equal(2);
      expect(rawLength(new Uint8Array(2))).equal(2);
      expect(rawLength(new ArrayBuffer(2))).equal(2);
    });
  });
});

import {expect, sinon} from '@tib/testlab';
import {EventEmitter} from 'events';
import {SinonStub} from 'sinon';
import {rawLength, sync} from '../utils';

describe('utils', function () {
  let stubConsoleError: SinonStub;

  beforeEach(() => {
    stubConsoleError = sinon.stub(console, 'error');
  });

  afterEach(() => {
    stubConsoleError?.restore();
  });

  describe('sync', function () {
    it('should work', function (done) {
      sync(async () => done())();
    });

    it('should invoke error callback when error throws', function (done) {
      sync(
        async () => {
          throw new Error('Boom');
        },
        (err: any) => {
          expect(err).instanceOf(Error);
          expect(err.message).equal('Boom');
          done();
        },
      )();
    });

    it('should emit error on emitter', function (done) {
      const ee = new EventEmitter();
      ee.on('error', err => {
        expect(err).instanceOf(Error);
        expect(err.message).equal('Boom');
        done();
      });
      sync(async () => {
        throw new Error('Boom');
      }, ee)();
    });

    it('should call console.error if no onerror callback provided when error throws', function () {
      const err = new Error('Boom');
      sync(() => {
        throw err;
      })();

      expect(stubConsoleError.calledWith(err));
    });
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

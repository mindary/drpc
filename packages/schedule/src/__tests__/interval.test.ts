import {expect} from '@loopback/testlab';
import aDefer from 'a-defer';
import {Interval} from '../interval';

describe('interval', function () {
  it('should work as an usual setInterval', async function () {
    const done = aDefer();
    const startTime = new Date().getTime();
    const interval = Interval.interval(function () {
      if (Math.abs(new Date().getTime() - startTime - 1000) <= 10) done.resolve();
      else done.reject(new Error('Took too much (or not enough) time'));
    }, 1000);

    await done;
    interval.clear();
  });

  it('should be able to clear an Interval', async function () {
    const done = aDefer();
    const interval = Interval.interval(function () {
      done.reject(new Error('Interval not cleared'));
    }, 200);

    setTimeout(() => interval.clear(), 100);
    setTimeout(() => done.resolve(), 300);

    await done;
    interval.clear();
  });

  it('should be able to reschedule an Interval', async function () {
    const done = aDefer();
    const startTime = new Date().getTime();

    const interval = Interval.interval(function () {
      if (Math.abs(new Date().getTime() - startTime - 600) <= 10) {
        done.resolve();
      } else {
        done.reject(new Error('Took too much (or not enough) time'));
      }
    }, 500);

    setTimeout((...args: any[]) => interval.reschedule(...args), 300, 300);

    await done;
    interval.clear();
  });

  it('should pass arguments to the handler', async function () {
    const done = aDefer();
    const interval = Interval.interval(
      function (arg) {
        expect(arg).equal(42);
        done.resolve();
      },
      50,
      42,
    );
    await done;
    interval.clear();
  });
});

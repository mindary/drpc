import {expect} from '@loopback/testlab';
import {Defer} from '@loopx/defer';
import delay from 'delay';
import {Timeout} from '../timeout';
import {assertNear} from './support';

describe('timeout', function () {
  it('should schedule a handler', async () => {
    const done = new Defer();
    const start = Date.now();

    Timeout.timeout(function () {
      assertNear(Date.now() - start, 50, 10);
      done.resolve();
    }, 50);

    await done;
  });

  it('should reschedule a handler', async () => {
    const done = new Defer();
    const start = Date.now();

    const timer = Timeout.timeout(function () {
      assertNear(Date.now() - start, 70, 10);
      done.resolve();
    }, 50);

    await delay(20);
    expect(timer.reschedule(50)).true();

    await done;
  });

  it('should reschedule multiple times', async () => {
    const done = new Defer();
    const start = Date.now();

    const timer = Timeout.timeout(function () {
      assertNear(Date.now() - start, 180, 20);
      done.resolve();
    }, 100);

    await delay(40);
    timer.reschedule(100);
    await delay(40);
    timer.reschedule(100);
    await done;
  });

  it('should clear a timer', async () => {
    const done = new Defer();
    const timer = Timeout.timeout(function () {
      done.reject('the timer should never get called');
    }, 20);

    timer.clear();

    await delay(50);
    done.resolve();

    await done;
  });

  it('should clear a timer after a reschedule', async () => {
    const done = new Defer();
    const timer = Timeout.timeout(function () {
      done.reject('the timer should never get called');
    }, 20);

    await delay(10);
    timer.reschedule(50);
    await delay(10);
    timer.clear();
    await delay(50);
    done.resolve();

    await done;
  });

  it('should return false if rescheduled too early', async () => {
    const done = new Defer();
    const start = Date.now();

    const timer = Timeout.timeout(function () {
      assertNear(Date.now() - start, 50, 10);
      done.resolve();
    }, 50);

    await delay(20);
    expect(timer.reschedule(10)).false();

    await done;
  });

  it('should pass arguments to the handler', async () => {
    const done = new Defer();
    Timeout.timeout(
      function (arg) {
        expect(arg).equal(42);
        done.resolve();
      },
      50,
      42,
    );
    await done;
  });
});

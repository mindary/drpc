import {assert} from 'ts-essentials';
import {ScheduleHandler} from './types';

export class Interval<H extends ScheduleHandler = ScheduleHandler> {
  protected handler?: ScheduleHandler;
  protected interval?: number;
  protected args: any[];

  protected hInterval?: any;

  static interval<H extends ScheduleHandler>(handler: H, interval: number, ...args: Parameters<H>) {
    return new Interval(handler, interval, ...args);
  }

  constructor(handler: H, interval: number, ...args: Parameters<H>) {
    this.handler = handler;
    this.interval = interval;
    this.args = args;

    this.hInterval = setInterval(this.handler, this.interval, ...this.args);
  }

  reschedule(interval?: number) {
    assert(this.handler);

    if (!interval) {
      interval = this.interval;
    }

    if (this.hInterval) {
      clearInterval(this.hInterval);
    }
    this.hInterval = setInterval(this.handler, interval, ...this.args);
  }

  clear() {
    if (this.hInterval) {
      clearInterval(this.hInterval);
      this.hInterval = undefined;
    }
  }

  destroy() {
    this.clear();
    this.handler = undefined;
    this.interval = undefined;
  }
}

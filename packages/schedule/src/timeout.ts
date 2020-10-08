import {ScheduleHandler} from './types';
import {getTime} from './time';

export class Timeout<H extends ScheduleHandler = ScheduleHandler> {
  protected handler: ScheduleHandler;
  protected args: any[];
  protected scheduled: number;

  protected started: number;
  protected rescheduled: number;
  protected hTimeout?: any;

  static timeout<H extends ScheduleHandler>(handler: H, timeout: number, ...args: Parameters<H>) {
    return new Timeout(handler, timeout, ...args);
  }

  constructor(handler: H, timeout: number, ...args: Parameters<H>) {
    this.handler = handler;
    this.args = args;
    this.scheduled = timeout;

    this.started = getTime();
    this.rescheduled = 0;

    this.hTimeout = setTimeout(() => this.handle(), timeout);
  }

  protected handle() {
    if (this.rescheduled > 0) {
      this.scheduled = this.rescheduled - (getTime() - this.started);
      this.hTimeout = setTimeout(() => this.handle(), this.scheduled);
      this.rescheduled = 0;
    } else {
      this.handler(...this.args);
    }
  }

  reschedule(timeout: number) {
    const now = getTime();
    if (now + timeout - (this.started + this.scheduled) < 0) {
      return false;
    }

    this.started = now;
    this.rescheduled = timeout;
    return true;
  }

  clear() {
    clearTimeout(this.hTimeout);
  }
}

import {assert} from 'ts-essentials';
import {CallTimeoutError} from './errors';

interface RequestReceipt {
  timeout: number;
  timestamp: number;
  resolve(value?: unknown): void;
  reject(value?: unknown): void;
}

export interface RequestRegistryOptions {
  timeout: number;
  interval: number;
}

const DEFAULT_STALL_INTERVAL = 5;
const DEFAULT_REQUEST_TIMEOUT = 10;

export class Store {
  public readonly options: RequestRegistryOptions;
  protected inflights: Map<number, RequestReceipt>;
  protected currentRequestId = 1;
  protected timer: any;

  constructor(options: Partial<RequestRegistryOptions> = {}) {
    this.inflights = new Map();
    this.options = Object.assign(
      {
        timeout: DEFAULT_REQUEST_TIMEOUT,
        interval: DEFAULT_STALL_INTERVAL,
      },
      options,
    );

    assert(
      this.options.timeout > this.options.interval,
      `requestTimeout(${this.options.timeout}s) must be greater than stallInterval(${this.options.interval}s)`,
    );
  }

  acquire<R = unknown>(timeout?: number): {id: number; promise: Promise<R>} {
    const id = this.nextRequestId();
    assert(!this.inflights.get(id), 'ID collision.');
    const promise = new Promise<R>((resolve, reject) => {
      this.inflights.set(id, {timeout: timeout ?? this.options.timeout, timestamp: Date.now(), resolve, reject});
    });
    return {id, promise};
  }

  has(id: number) {
    return this.inflights.has(id);
  }

  resolve(id: number, answer?: unknown) {
    const req = this.inflights.get(id);
    if (req) {
      this.inflights.delete(id);
      req.resolve(answer);
    }
  }

  reject(id: number, reason?: unknown) {
    const req = this.inflights.get(id);
    if (req) {
      this.inflights.delete(id);
      req.reject(reason);
    }
  }

  rejectAll(reason?: unknown) {
    this.inflights.forEach(req => {
      req.reject(reason);
    });
    this.inflights.clear();
  }

  clear() {
    this.inflights.clear();
  }

  check(now?: number) {
    now = now ?? Date.now();
    this.inflights.forEach((req, key) => {
      if (now! - req.timestamp > (req.timeout ?? this.options.timeout) * 1000) {
        this.inflights.delete(key);
        req.reject(new CallTimeoutError('Request timed out.'));
      }
    });
  }

  start() {
    assert(this.timer == null, 'already start stall');
    if (this.options.interval > 0) {
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      this.timer = setInterval(async () => this.check(), this.options.interval * 1000);
    }
  }

  stop() {
    if (this.timer != null) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  protected nextRequestId() {
    if (++this.currentRequestId === 0x100000000) this.currentRequestId = 1;
    return this.currentRequestId;
  }
}

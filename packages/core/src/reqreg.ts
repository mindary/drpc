import {assert} from 'ts-essentials';
import {TimeoutError} from './errors';

export interface Request {
  timeout: number;
  timestamp: number;
  resolve(value?: unknown): void;
  reject(value?: unknown): void;
}

export interface RequestRegistryOptions {
  timeout: number;
  interval: number;
}

const DEFAULT_STALL_INTERVAL = 5 * 1000;
const DEFAULT_REQUEST_TIMEOUT = 10 * 1000;

export class RequestRegistry {
  public readonly options: RequestRegistryOptions;
  protected store: Map<number, Request>;
  protected currentRequestId = 0;
  protected timer: any;

  constructor(options: Partial<RequestRegistryOptions> = {}) {
    this.store = new Map();
    this.options = Object.assign(
      {
        timeout: DEFAULT_REQUEST_TIMEOUT,
        interval: DEFAULT_STALL_INTERVAL,
      },
      options,
    );

    assert(
      this.options.timeout > this.options.interval,
      `requestTimeout(${this.options.timeout}ms) must be greater than stallInterval(${this.options.interval}ms)`,
    );
  }

  acquire<R = unknown>(timeout?: number): {id: number; promise: Promise<R>} {
    const id = this.nextRequestId();
    assert(!this.store.get(id), 'ID collision.');
    const promise = new Promise<R>((resolve, reject) => {
      this.store.set(id, {timeout: timeout ?? this.options.timeout, timestamp: Date.now(), resolve, reject});
    });
    return {id, promise};
  }

  has(id: number) {
    return this.store.has(id);
  }

  resolve(id: number, answer?: unknown) {
    const req = this.store.get(id);
    if (req) {
      this.store.delete(id);
      req.resolve(answer);
    }
  }

  reject(id: number, reason?: unknown) {
    const req = this.store.get(id);
    if (req) {
      this.store.delete(id);
      req.reject(reason);
    }
  }

  rejectAll(reason?: unknown) {
    this.store.forEach(req => {
      req.reject(reason);
    });
    this.store.clear();
  }

  clear() {
    this.store.clear();
  }

  tick(now?: number) {
    now = now ?? Date.now();
    this.store.forEach((req, key) => {
      if (now! - req.timestamp > (req.timeout ?? this.options.timeout)) {
        this.store.delete(key);
        req.reject(new TimeoutError('Request timed out.'));
      }
    });
  }

  start() {
    assert(this.timer == null, 'already start stall');
    if (this.options.interval > 0) {
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      this.timer = setInterval(async () => this.tick(), this.options.interval);
    }
  }

  stop() {
    if (this.timer != null) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  protected nextRequestId() {
    if (++this.currentRequestId === 0x100000000) this.currentRequestId = 0;
    return this.currentRequestId;
  }
}

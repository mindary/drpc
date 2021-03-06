import debugFactory from 'debug';
import {ValueOrPromise} from '@drpc/types';
import {Emittery, UnsubscribeFn} from '@libit/emittery';
import {ErrorLike} from '@libit/error/types';
import {ChainedError} from '@libit/error/chained';
import {NetAddress} from './types';
import {Packet, Parser} from '@drpc/packet';

const debug = debugFactory('drpc:core:transport');

export type TransportState = 'open' | 'closing' | 'closed';

export class TransportError extends ChainedError {
  constructor(public readonly transport: Transport, cause: ErrorLike) {
    super(cause);
  }
}

export interface TransportEvents {
  open: undefined;
  close: string | Error;
  error: TransportError;
  packet: Packet;
}

export interface TransportOptions {
  parser?: Parser;
}

export abstract class Transport extends Emittery<TransportEvents> {
  public sid: string;
  public state?: TransportState;
  public parser: Parser;
  public socket?: any;
  private subs: UnsubscribeFn[] = [];

  protected constructor(options?: TransportOptions) {
    super();
    options = options ?? {};
    this.parser = options.parser ?? new Parser();
    this.setup();
  }

  get address(): NetAddress {
    return {
      localAddress: '',
      localPort: 0,
    };
  }

  isOpen() {
    return this.state === 'open';
  }

  async ready() {
    if (this.isOpen()) return;
    if (this.state === 'closing' || this.state === 'closed') {
      throw new Error('transport is closing or closed');
    }
    return this.once('open');
  }

  async close(reason?: string | Error) {
    if (this.isOpen()) {
      this.state = 'closing';
      await this.doClose(reason);
    }
  }

  async send(data: Buffer) {
    if (this.isOpen()) {
      await this.ready();
      return this.doSend(data);
    } else if (debug.enabled) {
      debug('send denied for transport is closing or closed', data);
    }
  }

  protected setup() {
    this.subs.push(
      this.parser.on('packet', this.onPacket.bind(this)),
      this.parser.on('error', this.onError.bind(this)),
    );
  }

  protected open() {
    this.state = 'open';
    this.emit('open').catch(() => {});
  }

  protected async onPacket(packet: Packet) {
    return this.emit('packet', packet);
  }

  protected async onError(err: string | Error) {
    if (this.listenerCount('error')) {
      const error = new TransportError(this, err);
      await this.emit('error', error);
    } else {
      const message = typeof err === 'string' ? err : err.message;
      debug('ignored transport error %s', message);
    }
  }

  protected async onData(data: Buffer | Uint8Array | string) {
    if (this.isOpen()) {
      return this.parser.feed(data);
    }
  }

  protected async doClose(reason?: string | Error) {
    while (this.subs.length) {
      this.subs.shift()?.();
    }
    this.state = 'closed';
    await this.emit('close', reason ?? 'unknown');
  }

  protected abstract doSend(data: Buffer): ValueOrPromise<any>;
}

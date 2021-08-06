import debugFactory from 'debug';
import {ValueOrPromise} from '@remly/types';
import {Emittery, UnsubscribeFn} from '@libit/emittery';
import {ErrorLike} from '@libit/error/types';
import {ChainedError} from '@libit/error/chained';
import {Decoder, StandardDecoder} from './decoders';
import {Packet} from './packet';

const debug = debugFactory('remly:core:transport');

export type TransportState = 'open' | 'closing' | 'closed';

export class TransportError extends ChainedError {
  constructor(public readonly transport: Transport, cause: ErrorLike) {
    super(cause);
  }
}

export interface TransportHandler {
  handle(transport: Transport): void;
}

export interface TransportEvents {
  open: undefined;
  close: string | Error;
  error: TransportError;
  packet: Packet;
}

export interface TransportOptions {
  decoder?: Decoder;
}

export abstract class Transport extends Emittery<TransportEvents> {
  public sid: string;
  public state?: TransportState;
  public decoder: Decoder;
  private unsubs: UnsubscribeFn[] = [];

  protected constructor(options?: TransportOptions) {
    super();
    options = options ?? {};
    this.decoder = options.decoder ?? new StandardDecoder();
    this.setup();
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
    if (!this.isOpen()) {
      return;
    }
    this.state = 'closing';
    await this.doClose(reason);
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
    this.unsubs.push(
      this.decoder.on('packet', this.onPacket.bind(this)),
      this.decoder.on('error', this.onError.bind(this)),
    );
  }

  protected open() {
    this.state = 'open';
    // eslint-disable-next-line no-void
    void this.emit('open');
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

  protected onData(data: Buffer): ValueOrPromise<void> {
    if (this.isOpen()) {
      return this.decoder.feed(data);
    }
  }

  protected async doClose(reason?: string | Error) {
    while (this.unsubs.length) {
      this.unsubs.shift()?.();
    }
    this.state = 'closed';
    await this.emit('close', reason ?? 'unknown');
  }

  protected abstract doSend(data: Buffer): ValueOrPromise<any>;
}

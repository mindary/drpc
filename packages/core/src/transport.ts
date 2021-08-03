import debugFactory from 'debug';
import {ValueOrPromise} from '@remly/types';
import {Emittery, UnsubscribeFn} from '@libit/emittery';
import {ChainedError} from '@libit/error/chained';
import {Decoder, StandardDecoder} from './decoders';
import {Packet} from './packet';

const debug = debugFactory('remly:transport');

export type TransportState = 'open' | 'closing' | 'closed';

export class TransportError extends ChainedError {}

export interface TransportEvents {
  close: string | Error;
  error: Error;
  packet: Packet;
}

export interface TransportOptions {
  decoder?: Decoder;
}

export abstract class Transport extends Emittery<TransportEvents> {
  public sid: string;
  public state: TransportState;
  public decoder: Decoder;
  private unsubs: UnsubscribeFn[] = [];

  protected constructor(options?: TransportOptions) {
    super();
    options = options ?? {};
    this.state = 'open';
    this.decoder = options.decoder ?? new StandardDecoder();
    this.setup();
  }

  isOpen() {
    return this.state === 'open';
  }

  async close(reason?: string | Error) {
    if (!this.isOpen()) {
      return;
    }
    this.state = 'closing';
    await this.doClose(reason);
  }

  async send(data: Buffer) {
    return this.doSend(data);
  }

  protected setup() {
    this.unsubs.push(
      this.decoder.on('packet', this.handlePacket.bind(this)),
      this.decoder.on('error', this.handleError.bind(this)),
    );
  }

  protected async handlePacket(packet: Packet) {
    return this.emit('packet', packet);
  }

  protected async handleError(err: string | Error) {
    if (this.listenerCount('error')) {
      const error = new TransportError(err);
      await this.emit('error', error);
    } else {
      const message = typeof err === 'string' ? err : err.message;
      debug('ignored transport error %s', message);
    }
  }

  protected handleData(data: Buffer): ValueOrPromise<void> {
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

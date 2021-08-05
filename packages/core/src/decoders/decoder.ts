import {Emittery} from '@libit/emittery';
import {Packet} from '../packet';
import {ValueOrPromise} from '@remly/types';

export abstract class Decoder extends Emittery<{
  error: Error;
  packet: Packet;
}> {
  /**
   * Max message size.
   */
  static MAX_MESSAGE = 10000000;

  get MAX_MESSAGE() {
    return (this.constructor as any).MAX_MESSAGE;
  }

  feed(data: Buffer | Uint8Array | string): ValueOrPromise<void> {
    return this.doFeed(Buffer.isBuffer(data) ? data : Buffer.from(data));
  }

  dispose(): void {
    //
  }

  /**
   * Emit an error.
   * @private
   * @param {String} msg
   */

  protected async error(msg: string) {
    await this.emit('error', new Error(msg));
  }

  protected async packet(packet: Packet) {
    await this.emit('packet', packet);
  }

  protected abstract doFeed(data: Buffer): ValueOrPromise<void>;
}

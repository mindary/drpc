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

  abstract feed(data: Buffer): ValueOrPromise<void>;
  abstract dispose(): void;
}

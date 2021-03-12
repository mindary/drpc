import Emittery from 'emittery';
import {Packet} from '../packet';

export abstract class Parser extends Emittery<{
  error: Error;
  message: Packet;
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

  protected error(msg: string) {
    // eslint-disable-next-line no-void
    void this.emit('error', new Error(msg));
  }

  protected message(packet: Packet) {
    // eslint-disable-next-line no-void
    void this.emit('message', packet);
  }

  abstract feed(data: Buffer): void;
}

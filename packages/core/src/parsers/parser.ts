import {Emittery} from '@mindary/emittery';
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

  protected async error(msg: string) {
    await this.emit('error', new Error(msg));
  }

  protected async message(packet: Packet) {
    await this.emit('message', packet);
  }

  abstract feed(data: Buffer): void;
}

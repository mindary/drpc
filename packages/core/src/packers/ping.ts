import {BufferReader, Writer} from '@libit/bufio';
import {Packer} from './types';
import {HeartbeatMessage} from '../messages';

export class PingPacker implements Packer<HeartbeatMessage> {
  size(message: HeartbeatMessage): number {
    return message.payload.length;
  }

  read(br: BufferReader): HeartbeatMessage {
    const message = {} as HeartbeatMessage;
    message.payload = br.readBytes(br.left());
    return message;
  }

  write(message: HeartbeatMessage, bw: Writer) {
    bw.writeBytes(message.payload);
  }
}

export const ping = new PingPacker();

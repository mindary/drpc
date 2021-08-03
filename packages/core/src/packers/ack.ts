import {BufferReader, Writer} from '@libit/bufio';
import {Packer} from './types';
import {AckMessage} from '../messages';

export class AckPacker implements Packer<AckMessage> {
  size(message: AckMessage): number {
    return 4 + message.payload.length;
  }

  read(br: BufferReader): AckMessage {
    const message = {} as AckMessage;
    message.id = br.readU32();
    message.payload = br.readBytes(br.left());
    return message;
  }

  write(message: AckMessage, bw: Writer) {
    bw.writeU32(message.id);
    bw.writeBytes(message.payload);
  }
}

export const ack = new AckPacker();

import {BufferReader, Writer} from '@libit/bufio';
import {Packer} from './types';
import {CallMessage} from '../messages';

export class CallPacker implements Packer<CallMessage> {
  size(message: CallMessage): number {
    let size = 0;
    size += 1;
    size += message.name.length;
    size += 4;
    size += message.payload.length;
    return size;
  }

  read(br: BufferReader): CallMessage {
    const message = {} as CallMessage;
    const size = br.readU8();
    message.name = br.readString(size, 'ascii');
    message.id = br.readU32();
    message.payload = br.readBytes(br.left());
    return message;
  }

  write(message: CallMessage, bw: Writer) {
    bw.writeU8(message.name.length);
    bw.writeString(message.name, 'ascii');
    bw.writeU32(message.id);
    bw.writeBytes(message.payload);
  }
}

export const call = new CallPacker();

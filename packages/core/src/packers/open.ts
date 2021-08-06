import {BufferReader, Writer} from '@libit/bufio';
import {Packer} from './types';
import {OpenMessage} from '../messages';

export class OpenPacker implements Packer<OpenMessage> {
  size(message: OpenMessage): number {
    let size = 0;
    size += 4;
    size += 1;
    size += message.sid.length;
    size += 8;
    return size;
  }

  read(br: BufferReader): OpenMessage {
    const message = {} as OpenMessage;
    const size = br.readU8();
    message.sid = br.readString(size, 'ascii');
    message.keepalive = br.readU32();
    message.challenge = br.readBytes(8);
    return message;
  }

  write(message: OpenMessage, bw: Writer) {
    bw.writeU8(message.sid.length);
    bw.writeString(message.sid, 'ascii');
    bw.writeU32(message.keepalive);
    bw.writeBytes(message.challenge);
  }
}

export const open = new OpenPacker();

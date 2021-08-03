import {BufferReader, Writer} from '@libit/bufio';
import {Packer} from './types';
import {SignalMessage} from '../messages';

export class SignalPacker implements Packer<SignalMessage> {
  size(message: SignalMessage): number {
    let size = 0;
    size += 1;
    size += message.name.length;
    size += message.payload.length;
    return size;
  }

  read(br: BufferReader): SignalMessage {
    const message = {} as SignalMessage;
    const size = br.readU8();
    message.name = br.readString(size, 'ascii');
    message.payload = br.readBytes(br.left());
    return message;
  }

  write(message: SignalMessage, bw: Writer) {
    bw.writeU8(message.name.length);
    bw.writeString(message.name, 'ascii');
    bw.writeBytes(message.payload);
  }
}

export const signal = new SignalPacker();

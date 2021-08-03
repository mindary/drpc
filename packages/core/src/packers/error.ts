import {BufferReader, Writer} from '@libit/bufio';
import {Packer} from './types';
import {ErrorMessage} from '../messages';

export class ErrorPacker implements Packer<ErrorMessage> {
  size(message: ErrorMessage): number {
    let size = 0;
    size += 4;
    size += 1;
    size += 2;
    size += Buffer.byteLength(message.message);
    size += message.payload.length;
    return size;
  }

  read(br: BufferReader): ErrorMessage {
    const message = {} as ErrorMessage;
    message.id = br.readU32();
    message.code = br.readU8();
    const size = br.readU16();
    message.message = br.readString(size, 'utf-8');
    message.payload = br.readBytes(br.left());
    return message;
  }

  write(message: ErrorMessage, bw: Writer) {
    bw.writeU32(message.id);
    bw.writeU8(message.code);
    bw.writeU16(Buffer.byteLength(message.message));
    bw.writeString(message.message, 'utf-8');
    bw.writeBytes(message.payload);
  }
}

export const error = new ErrorPacker();

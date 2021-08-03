import {BufferReader, Writer} from '@libit/bufio';
import {Packer} from './types';
import {ConnectErrorMessage} from '../messages';

export class ConnectErrorPacker implements Packer<ConnectErrorMessage> {
  size(message: ConnectErrorMessage): number {
    let size = 0;
    size += 1;
    size += 2;
    size += message.code?.length ?? 0;
    size += Buffer.byteLength(message.message);
    return size;
  }

  read(br: BufferReader): ConnectErrorMessage {
    const message = {} as ConnectErrorMessage;
    let size = br.readU8();
    message.code = br.readString(size, 'ascii');
    size = br.readU16();
    message.message = br.readString(size, 'utf-8');
    return message;
  }

  write(message: ConnectErrorMessage, bw: Writer) {
    bw.writeU8(message.code?.length ?? 0);
    bw.writeString(message.code ?? '');
    bw.writeU16(Buffer.byteLength(message.message));
    bw.writeString(message.message, 'utf-8');
  }
}

export const connectError = new ConnectErrorPacker();

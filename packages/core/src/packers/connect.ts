import {BufferReader, Writer} from '@libit/bufio';
import {Packer} from './types';
import {ConnectMessage, OpenMessage} from '../messages';

export class ConnectPacker implements Packer<ConnectMessage> {
  size(message: ConnectMessage): number {
    let size = 0;
    size += message.payload.length;
    return size;
  }

  read(br: BufferReader): ConnectMessage {
    const message = {} as ConnectMessage;
    message.payload = br.readBytes(br.left());
    return message;
  }

  write(message: ConnectMessage, bw: Writer) {
    bw.writeBytes(message.payload);
  }
}

export const connect = new ConnectPacker();

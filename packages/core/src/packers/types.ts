import {BufferReader, Writer} from '@libit/bufio';
import {Message} from '../messages';

export interface Packer<M extends Message> {
  size(message: M): number;

  read(br: BufferReader): M;

  write(message: M, bw: Writer): void;
}

import {EventEmitter} from 'events';
import {TransportContext, Framer} from '../defines';
import {Transport} from '../transport';
import {JsonFramer} from '../framers';
import {RequestMessage} from '../request';
import {ResponseMessage} from '../response';

const BUFFER_INITIAL_SIZE = 1024 * 1024; // 1MB
const BUFFER_GROW_RATIO = 1.5;

export class StreamTransport extends Transport {
  protected _framer: Framer<any>;

  constructor(framer?: Framer<any>) {
    super();

    this._framer = framer ?? new JsonFramer();
  }

  get framer() {
    return this._framer;
  }

  createParser(context: TransportContext) {
    const parser = new LengthPrefixParser();
    parser.on('data', data => {
      let message;
      try {
        message = this._framer.decode(data);
      } catch (e) {
        return this.emit('error:decode', e, data);
      }
      if (message) this.recv(message, context);
    });
    return parser;
  }

  read(data: Buffer | Uint8Array | number[], context?: TransportContext) {
    context = this.sureContext(context);
    if (!context.parser) {
      context.parser = this.createParser(context);
    }
    context.parser.parse(data);
  }

  write(data: Buffer | Uint8Array | number[], context?: TransportContext) {
    throw new Error('Unimplemented');
  }

  async send(
    message: RequestMessage | ResponseMessage,
    context?: TransportContext,
  ) {
    const data = this._framer.encode(message);
    const len = new Uint32Array([data.length]);
    this.write(Buffer.from(<ArrayBuffer>len.buffer), context);
    this.write(data, context);
  }
}

export class LengthPrefixParser extends EventEmitter {
  buffer: Buffer;
  pos: number;

  constructor(
    protected initialSize: number = BUFFER_INITIAL_SIZE,
    protected ratio: number = BUFFER_GROW_RATIO,
  ) {
    super();
    this.reset(initialSize);
  }

  reset(size?: number) {
    if (size === undefined) {
      size = this.initialSize;
    }
    size = size || 0;
    this.buffer = Buffer.alloc(size);
    this.pos = 0;
  }

  protected check() {
    const headerLength = Uint32Array.BYTES_PER_ELEMENT;
    const bodyLength = new Uint32Array(this.buffer.buffer, 0, 1)[0];
    const totalMsgLength = headerLength + bodyLength;

    if (this.pos > headerLength && this.pos >= totalMsgLength) {
      const data = this.buffer.slice(headerLength, headerLength + bodyLength);

      this.emit('data', data);

      // copy remaining chunk to the start of the buffer and reset pointers
      this.buffer.copy(this.buffer, 0, totalMsgLength, this.pos);
      this.pos = this.pos - totalMsgLength;

      if (this.pos >= headerLength) {
        this.check();
      }
    }
  }

  parse(chunk: Buffer) {
    // extend the buffer to ensure that it is
    // large enough to store the incoming chunk
    while (this.pos + chunk.byteLength > this.buffer.byteLength) {
      const newBuffer = Buffer.alloc(this.buffer.byteLength * this.ratio);
      this.buffer.copy(newBuffer);
      this.buffer = newBuffer;
    }

    this.pos += chunk.copy(this.buffer, this.pos);
    this.check();
  }
}

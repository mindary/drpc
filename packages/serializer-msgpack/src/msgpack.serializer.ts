import {Raw, Serializer} from '@remly/serializer';
import {encode, decode, ExtensionCodec} from '@msgpack/msgpack';
import {ExtensionDecoderType, ExtensionEncoderType} from '@msgpack/msgpack/src/ExtensionCodec';

export interface MsgpackSerializerOptions<ContextType = undefined> {
  codecs?: ExtensionCodec<ContextType>;
}

export interface Codec<ContextType> {
  type: number;
  encode: ExtensionEncoderType<ContextType>;
  decode: ExtensionDecoderType<ContextType>;
}

export class MsgpackSerializer<ContextType = undefined> implements Serializer {
  codecs: ExtensionCodec<ContextType>;

  constructor(options?: MsgpackSerializerOptions<ContextType>) {
    this.codecs = options?.codecs ?? new ExtensionCodec();
  }

  register(codec: Codec<ContextType>): void {
    this.codecs.register(codec);
  }

  deserialize<T = unknown>(input: Raw, request?: ContextType): T {
    if (input == null) {
      return input as any;
    }

    return <T>decode(input, <any>{extensionCodec: this.codecs, request});
  }

  serialize<T = any>(input: T, request?: ContextType): Buffer {
    return Buffer.from(encode(input, <any>{extensionCodec: this.codecs, request}));
  }
}

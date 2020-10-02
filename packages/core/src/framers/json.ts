import {Codec, Constructor, Framer, isCodec} from '../defines';

interface Persistence {
  $class: string;
}

export class DefaultCodec<T = Record<string, any>> implements Codec<T> {
  clazz: Constructor<T>;

  constructor(clazz: Constructor<T>) {
    this.clazz = clazz;
  }

  encode(input: T) {
    return Object.assign({}, input);
  }

  decode(input: any): T {
    if (!input || !input.$props) {
      throw new Error('Invalid input for decoding to ' + this.clazz.name);
    }
    const obj: any = new this.clazz();
    for (const prop of Object.keys(input.$props))
      obj[prop] = input.$props[prop];
    return <T>obj;
  }
}

export class JsonFramer implements Framer<Constructor<any>> {
  codecs: {[name: string]: Codec<any>} = {};

  constructor(...codecs: any[]) {
    if (codecs.length) {
      this.register(codecs);
    }
  }

  register(...codecs: any[]) {
    for (const c of codecs) {
      if (isCodec(c)) {
        this.codecs[c.clazz.name] = c;
      } else if (typeof c === 'function') {
        this.codecs[c.name] = new DefaultCodec<any>(c);
      }
    }
  }

  encode(input: any): Buffer {
    return Buffer.from(
      JSON.stringify(input, (key: string, value: any) => {
        if (value && this.codecs[value.constructor.name]) {
          return {
            $class: value.constructor.name,
            $props: this.codecs[value.constructor.name].encode(value),
          };
        }
        return value;
      }),
    );
  }

  decode(input: Buffer | Uint8Array | number[]): any {
    return JSON.parse(input.toString(), (key: any, value: any) => {
      if (value?.$class && this.codecs[value.$class]) {
        return this.codecs[value.$class].decode(value);
      }
      return value;
    });
  }
}

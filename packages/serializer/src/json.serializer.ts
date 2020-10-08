import {Raw, Serializer} from './types';

export class JsonSerializer implements Serializer {
  deserialize<T = unknown>(input: Raw): T {
    if (input == null) {
      return input as any;
    }
    return JSON.parse(input.toString(), (key: string, value: any): any => {
      if (value && value.type === 'Buffer') {
        return Buffer.from(value.data);
      }
      return value;
    });
  }

  serialize<T = any>(input: T): Buffer {
    return Buffer.from(JSON.stringify(input));
  }
}

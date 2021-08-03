import {Raw, Serializer} from './types';
import {rawLength} from './utils';

export class JsonSerializer implements Serializer {
  deserialize<T = unknown>(input: Raw): T | undefined | null {
    if (input == null) {
      return input as any;
    }
    if (rawLength(input) > 0) {
      return JSON.parse(input.toString(), (key: string, value: any): any => {
        if (value && value.type === 'Buffer') {
          return Buffer.from(value.data);
        }
        return value;
      });
    }
    return undefined;
  }

  serialize<T = any>(input: T): Buffer {
    return Buffer.from(JSON.stringify(input ?? null));
  }
}

export type Raw = ArrayLike<number> | ArrayBuffer;

export interface Serializer {
  serialize<T = any>(input: T): Buffer;

  deserialize<T = any>(input: Raw): T;
}

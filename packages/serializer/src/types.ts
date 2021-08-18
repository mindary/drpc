export type Raw = ArrayLike<number> | ArrayBuffer;

export interface Serializer<ContextType = undefined> {
  serialize<T = any>(input: T, request?: ContextType): Buffer;

  deserialize<T = any>(input: Raw, request?: ContextType): T | undefined | null;
}

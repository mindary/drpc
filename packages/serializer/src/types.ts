export type Raw = ArrayLike<number> | ArrayBuffer;

export interface Serializer<ContextType = undefined> {
  serialize<T = any>(input: T, context?: ContextType): Buffer;

  deserialize<T = any>(input: Raw, context?: ContextType): T | undefined | null;
}

const LEGAL_KEY_REGEX = /^[0-9a-z_.-]+$/;
const LEGAL_NON_BINARY_VALUE_REGEX = /^[ -~]*$/;

export type MetadataValue = string | Buffer;
export type MetadataObject = Map<string, MetadataValue[]>;
export type CompatibleMetadataValue = MetadataValue | number | boolean;

function isLegalKey(key: string): boolean {
  return LEGAL_KEY_REGEX.test(key);
}

function isLegalNonBinaryValue(value: string): boolean {
  return LEGAL_NON_BINARY_VALUE_REGEX.test(value);
}

function isBinaryKey(key: string): boolean {
  return key.endsWith('-bin');
}

function isCustomMetadata(key: string): boolean {
  return !key.startsWith('rpc-');
}

function normalizeKey(key: string): string {
  return key.toLowerCase();
}

function validate(key: string, value?: MetadataValue): void {
  if (!isLegalKey(key)) {
    throw new Error('Metadata key "' + key + '" contains illegal characters');
  }
  if (value !== null && value !== undefined) {
    if (isBinaryKey(key)) {
      if (!(value instanceof Buffer)) {
        throw new Error("keys that end with '-bin' must have Buffer values");
      }
    } else {
      if (value instanceof Buffer) {
        throw new Error("keys that don't end with '-bin' must have String values");
      }
      if (!isLegalNonBinaryValue(value)) {
        throw new Error('Metadata string value "' + value + '" contains illegal characters');
      }
    }
  }
}

/**
 * A class for storing metadata. Keys are normalized to lowercase ASCII.
 */
export class Metadata {
  protected data: MetadataObject = new Map<string, MetadataValue[]>();

  constructor() {}

  static isMetadata(obj?: any): obj is Metadata {
    return obj instanceof Metadata || (obj?.data && isMetadataObject(obj));
  }

  static from(
    source?:
      | Metadata
      | MetadataObject
      | Record<string, CompatibleMetadataValue | CompatibleMetadataValue[] | undefined>,
  ) {
    if (Metadata.isMetadata(source)) {
      return source.clone();
    }

    const md = new Metadata();
    if (isMetadataObject(source)) {
      md.data = source;
      return md.clone();
    } else if (source) {
      Object.keys(source).forEach(key => {
        // Reserved headers (beginning with `:`) are not valid keys.
        if (key.charAt(0) === ':') {
          return;
        }

        const value = source[key];
        try {
          if (isBinaryKey(key)) {
            // array
            if (Array.isArray(value)) {
              value.forEach(v => {
                md.add(key, Buffer.isBuffer(v) ? v : Buffer.from(v.toString(), 'base64'));
              });
            } else if (value !== undefined) {
              if (isCustomMetadata(key)) {
                const arr = typeof value === 'string' ? value.split(',') : [value];
                arr.forEach(v => {
                  md.add(key, Buffer.isBuffer(v) ? v : Buffer.from(v.toString().trim(), 'base64'));
                });
              } else {
                md.add(key, Buffer.isBuffer(value) ? value : Buffer.from(value.toString(), 'base64'));
              }
            }
          } else {
            if (Array.isArray(value)) {
              value.forEach(v => {
                md.add(key, v.toString());
              });
            } else if (value !== undefined) {
              md.add(key, value.toString());
            }
          }
        } catch (e) {
          const message = `Failed to add metadata entry ${key}: ${value}. ${
            (e as Error).message
          }. For more information see https://github.com/grpc/grpc-node/issues/1173`;
          console.error(message);
        }
      });
    }
    return md;
  }

  /**
   * Sets the given value for the given key by replacing any other values
   * associated with that key. Normalizes the key.
   * @param key The key to whose value should be set.
   * @param value The value to set. Must be a buffer if and only
   *   if the normalized key ends with '-bin'.
   */
  set(key: string, value: MetadataValue): void {
    key = normalizeKey(key);
    validate(key, value);
    this.data.set(key, [value]);
  }

  /**
   * Adds the given value for the given key by appending to a list of previous
   * values associated with that key. Normalizes the key.
   * @param key The key for which a new value should be appended.
   * @param value The value to add. Must be a buffer if and only
   *   if the normalized key ends with '-bin'.
   */
  add(key: string, value: MetadataValue): void {
    key = normalizeKey(key);
    validate(key, value);

    const existingValue: MetadataValue[] | undefined = this.data.get(key);

    if (existingValue === undefined) {
      this.data.set(key, [value]);
    } else {
      existingValue.push(value);
    }
  }

  /**
   * Removes the given key and any associated values. Normalizes the key.
   * @param key The key whose values should be removed.
   */
  remove(key: string): void {
    key = normalizeKey(key);
    validate(key);
    this.data.delete(key);
  }

  has(key: string) {
    key = normalizeKey(key);
    validate(key);
    return this.data.has(key);
  }

  /**
   * Gets a list of all values associated with the key. Normalizes the key.
   * @param key The key whose value should be retrieved.
   * @return A list of values associated with the given key.
   */
  get(key: string): MetadataValue[] {
    key = normalizeKey(key);
    validate(key);
    return this.data.get(key) || [];
  }

  getAsString(key: string, encoding?: BufferEncoding): string[] {
    return this.get(key).map(v => (typeof v === 'string' ? v : v.toString(encoding ?? 'utf-8')));
  }

  getAsBuffer(key: string, encoding?: BufferEncoding): Buffer[] {
    return this.get(key).map(v => (Buffer.isBuffer(v) ? v : Buffer.from(v, encoding ?? 'base64')));
  }

  /**
   * Gets a plain object mapping each key to the first value associated with it.
   * This reflects the most common way that people will want to see metadata.
   * @return A key/value mapping of the metadata.
   */
  getMap(): {[key: string]: MetadataValue} {
    const result: {[key: string]: MetadataValue} = {};

    this.data.forEach((values, key) => {
      if (values.length > 0) {
        const v = values[0];
        result[key] = Buffer.isBuffer(v) ? v.slice() : v;
      }
    });
    return result;
  }

  /**
   * Clones the metadata object.
   * @return The newly cloned object.
   */
  clone(): Metadata {
    const newMetadata = new Metadata();
    const newData = newMetadata.data;

    this.data.forEach((value, key) => {
      const clonedValue: MetadataValue[] = value.map(v => {
        if (v instanceof Buffer) {
          return Buffer.from(v);
        } else {
          return v;
        }
      });

      newData.set(key, clonedValue);
    });

    return newMetadata;
  }

  /**
   * Merges all key-value pairs from a given Metadata object into this one.
   * If both this object and the given object have values in the same key,
   * values from the other Metadata object will be appended to this object's
   * values.
   * @param other A Metadata object.
   */
  merge(other: Metadata): void {
    other.data.forEach((values, key) => {
      const mergedValue: MetadataValue[] = (this.data.get(key) || []).concat(values);

      this.data.set(key, mergedValue);
    });
  }

  toObject(): Record<string, string[]> {
    const result: Record<string, string[]> = {};
    this.data.forEach((values, key) => {
      // We assume that the user's interaction with this object is limited to
      // through its public API (i.e. keys and values are already validated).
      result[key] = values.map(value => (Buffer.isBuffer(value) ? value.toString('base64') : value));
    });
    return result;
  }

  /**
   * This modifies the behavior of JSON.stringify to show an object
   * representation of the metadata map.
   */
  toJSON() {
    const result: {[key: string]: MetadataValue[]} = {};
    for (const [key, values] of this.data.entries()) {
      result[key] = values;
    }
    return result;
  }
}

function isMetadataObject(x?: any): x is MetadataObject {
  return x && Object.prototype.toString.call(x.data) === '[object Map]';
}

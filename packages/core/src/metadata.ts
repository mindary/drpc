const LEGAL_KEY_REGEX = /^[0-9a-z_.-]+$/;
const LEGAL_NON_BINARY_VALUE_REGEX = /^[ -~]*$/;

export type MetadataValue = string | Buffer;
export type MetadataObject = Map<string, MetadataValue[]>;

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

export interface MetadataOptions {
  /* Signal that the request is idempotent. Defaults to false */
  idempotentRequest?: boolean;
  /* Signal that the call should not return UNAVAILABLE before it has
   * started. Defaults to false. */
  waitForReady?: boolean;
  /* Signal that the call is cacheable. GRPC is free to use GET verb.
   * Defaults to false */
  cacheableRequest?: boolean;
  /* Signal that the initial metadata should be corked. Defaults to false. */
  corked?: boolean;
}

/**
 * A class for storing metadata. Keys are normalized to lowercase ASCII.
 */
export class Metadata {
  protected data: MetadataObject = new Map<string, MetadataValue[]>();
  #options: MetadataOptions;

  constructor(options?: MetadataOptions) {
    if (options === undefined) {
      this.#options = {};
    } else {
      this.#options = options;
    }
  }

  get options(): MetadataOptions {
    return this.#options;
  }

  set options(options: MetadataOptions) {
    this.#options = options;
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
        result[key] = v instanceof Buffer ? v.slice() : v;
      }
    });
    return result;
  }

  /**
   * Clones the metadata object.
   * @return The newly cloned object.
   */
  clone(): Metadata {
    const newMetadata = new Metadata(this.options);
    const newInternalRepr = newMetadata.data;

    this.data.forEach((value, key) => {
      const clonedValue: MetadataValue[] = value.map(v => {
        if (v instanceof Buffer) {
          return Buffer.from(v);
        } else {
          return v;
        }
      });

      newInternalRepr.set(key, clonedValue);
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

  // For compatibility with the other Metadata implementation
  private _getData() {
    return this.data;
  }
}

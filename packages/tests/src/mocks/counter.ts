/*
 * Helper for testing object instantiation/serialization
 */
export class Counter {
  count: number;

  constructor(value?: number) {
    if (!value || !isFinite(value)) value = 0;
    this.count = value;
  }

  incrementBy(value: number) {
    this.count += value;
  }
}

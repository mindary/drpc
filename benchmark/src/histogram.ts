export interface HistogramParams {
  resolution: number;
  maxPossible: number;
}

/**
 * Histogram class. Collects data and exposes a histogram and other statistics.
 */
export class Histogram {
  protected sum: number;
  protected sumOfSquares: number;
  protected multiplier: number;
  protected count: number;
  protected minSeen: number;
  protected maxSeen: number;
  protected buckets: number[];

  /**
   * @constructor
   * @param {number} resolution The histogram's bucket resolution. Must be positive
   * @param {number} maxPossible The maximum allowed value. Must be greater than 1
   */
  constructor(public resolution: number, public maxPossible: number) {
    this.sum = 0;
    this.sumOfSquares = 0;
    this.multiplier = 1 + resolution;
    this.count = 0;
    this.minSeen = maxPossible;
    this.maxSeen = 0;
    this.buckets = new Array(this.bucketFor(maxPossible) + 1);
    this.buckets.fill(0);
  }

  /**
   * Get the bucket index for a given value.
   * @param {number} value The value to check
   * @return {number} The bucket index
   */
  bucketFor(value: number) {
    return Math.floor(Math.log(value) / Math.log(this.multiplier));
  }

  /**
   * Get the minimum value for a given bucket index
   * @param index The bucket index to check
   * @return {number} The minimum value for that bucket
   */
  bucketStart(index: number) {
    return Math.pow(this.multiplier, index);
  }

  /**
   * Add a value to the histogram. This updates all statistics with the new
   * value. Those statistics should not be modified except with this function
   * @param {number} value The value to add
   */
  add(value: number) {
    // Ensure value is a number
    value = +value;
    this.sum += value;
    this.sumOfSquares += value * value;
    this.count++;
    if (value < this.minSeen) {
      this.minSeen = value;
    }
    if (value > this.maxSeen) {
      this.maxSeen = value;
    }
    this.buckets[this.bucketFor(value)]++;
  }

  /**
   * Get the mean of all added values
   * @return {number} The mean
   */
  mean() {
    return this.sum / this.count;
  }

  /**
   * Get the variance of all added values. Used to calulate the standard deviation
   * @return {number} The variance
   */
  variance() {
    if (this.count === 0) {
      return 0;
    }
    return (this.sumOfSquares * this.count - this.sum * this.sum) / (this.count * this.count);
  }

  /**
   * Get the standard deviation of all added values
   * @return {number} The standard deviation
   */
  stddev() {
    return Math.sqrt(this.variance());
  }

  /**
   * Get the maximum among all added values
   * @return {number} The maximum
   */
  maximum() {
    return this.maxSeen;
  }

  /**
   * Get the minimum among all added values
   * @return {number} The minimum
   */
  minimum() {
    return this.minSeen;
  }

  /**
   * Get the number of all added values
   * @return {number} The count
   */
  getCount() {
    return this.count;
  }

  /**
   * Get the sum of all added values
   * @return {number} The sum
   */
  getSum() {
    return this.sum;
  }

  /**
   * Get the sum of squares of all added values
   * @return {number} The sum of squares
   */
  getSumOfSquares() {
    return this.sumOfSquares;
  }

  /**
   * Get the raw histogram as a list of bucket sizes
   * @return {Array.<number>} The buckets
   */
  getContents() {
    return this.buckets;
  }
}

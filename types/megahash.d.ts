declare module "megahash" {
  /**
   * 0: An error occurred (out of memory).
   * 1: A key was added to the hash (i.e. unique key).
   * 2: An existing key was replaced in the hash.
   */
  export type SetStatus = 0 | 1 | 2;

  export type Key = Buffer | string;

  export type Value =
    | Buffer
    | string
    | null
    | BigInt
    | number
    | object
    | boolean;

  export interface HashStats {
    numKeys: number;
    dataSize: number;
    indexSize: number;
    metaSize: number;
    numIndexes: number;
  }
  export default class MegaHash {
    set(key: Key, value: Value): SetStatus;
    get(key: Key): Value | undefined;
    has(key: Key): boolean;
    delete(key: Key): boolean;
    clear(): void;
    /**
     * Without an argument, fetch the first key in the hash, in undefined order.
     * With a key specified, fetch the next key, also in undefined order.
     * Returns undefined when the end of the hash has been reached.
     *
     * @example
     *  var key = hash.nextKey();
     *  while (key) {
     *    // do something with key
     *    key = hash.nextKey(key);
     *  }
     */
    nextKey(key: Key): string;
    /**
     * Return the total number of keys currently in the hash.
     * This is very fast, as it does not have to iterate over the keys
     * (an internal counter is kept up to date on each set/delete).
     */
    length(): number;

    stats(): HashStats;
  }
}

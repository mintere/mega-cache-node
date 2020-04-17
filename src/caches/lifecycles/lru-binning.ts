import { Cache } from "../abstract";
import { AsyncronousCache } from "../abstract";

/**
 * An in-memory cache designed to mimick LRU caching without a doubly linked list.
 * Uses bins to protect recent writes from deletion while clearing less frequently used keys in batches.
 * 
 * The first priority of this cache method is to ensure memory usage stays below a
 * configurable maximum.
 * 
 * The cache contains three bins, a `protectedBin`, `writableBin`, and `frozenBin`. 
 * Each is a [`MegaHash`][megahash] which stores large blobs outside of V8's heap.
 * 
 * [megahash]: https://github.com/jhuckaby/megahash
 *
 * When writing to the cache, we first check to make sure there is room (`maxBinSize`).
 * If there is not enough space, we rotate the bins before setting the value.
 * 
 * When reading the cache, we first look for the value in the protected bin.
 * If the key is in the protected bin, return the value, otherwise check the writable bin.
 * If the key is in the writable bin, return the value, otherwise check the frozen bin.
 * If the key is in the frozen bin, move the value to the protected bin and return the value
 * Otherwise, returns undefined.
 * 
 * Rotates are O(1), clearing is O(n) and scheduled for the nextTick after rotation.
 * During a rotate:
 * - the `frozenBin` is scheduled to be cleared in the nextTick (unless it is garbage collected by node before then)
 * - the `writableBin` becomes the `frozenBin`
 * - the `protectedBin` becomes the `writableBin`
 * 
 * @example
 *     import { MemCacheLRUBinning, toMebibytes } from "mega-cache";
 *     
 *     const maxBinSize = toMebibytes(256); // The cache can store upto 2 times this amount, and potentially peak at 3 times prior to GC
 *     const minWritablePortion = 0.2; // What portion of the writable bin should be reserved for new data
 * 
 *     let cache = new MemCacheLRUBinning(
 *       maxBinSize, // defaults to 50MiB
 *       minWritablePortion // defaults to 0.2
 *     );
 *     cache.set("key", Buffer.from("value"));
 *     cache.get("key").toString(); //=> "value"
 *  */
export default class LRUBinningCache implements AsyncronousCache {
  cacheType: "async" = "async";

  protectedBin: Cache;
  writableBin: Cache;
  coldBin?: Cache;

  maxBinSize: number; // in bytes

  minWritablePortion: number;

  get maxProtectedBinSize(): number {
    return this.maxBinSize * (1 - this.minWritablePortion);
  }

  maxBinEntries: number;

  newCache: () => Cache;

  /**
   * @param maxBinSize The maximum size, in bytes, for each bin.
   * The cache will store up to thrice this amount of data
   */
  constructor(
    maxBinSize: number,
    maxBinEntries: number,
    minWritablePortion = 0.2,
    newCache: () => Cache
  ) {
    this.maxBinSize = maxBinSize;
    this.maxBinEntries = maxBinEntries;

    this.minWritablePortion = minWritablePortion;

    this.newCache = newCache;

    this.writableBin = newCache();
    this.protectedBin = newCache();
  }

  get dataSize() {
    return (
      this.protectedBin.dataSize +
      this.writableBin.dataSize +
      (this.coldBin?.dataSize || 0)
    );
  }

  get count() {
    return (
      this.protectedBin.count +
      this.writableBin.count +
      (this.coldBin?.count || 0)
    );
  }

  private async _getHot(key: Buffer): Promise<Buffer | undefined> {
    const pV = await this.protectedBin.get(key);
    if (typeof pV !== "undefined") return pV;

    const wV = await this.writableBin.get(key);
    if (typeof wV !== "undefined") return wV;

    return undefined;
  }

  private async _getCold(key: Buffer): Promise<Buffer | undefined> {
    if (typeof this.coldBin !== "undefined") {
      const v = await this.coldBin.get(key);
      if (typeof v === "undefined") return undefined;

      if (
        this.protectedBin.dataSize + v.length > this.maxProtectedBinSize ||
        this.protectedBin.count >=
          this.maxBinEntries * (1 - this.minWritablePortion)
      ) {
        this.rotate();
      }

      this.protectedBin.set(key, v);
      this.coldBin.delete(key);

      return v;
    }

    return undefined;
  }

  async get(key: Buffer | string): Promise<Buffer | undefined> {
    if (typeof key === "string") key = Buffer.from(key, "utf-8");

    const hotVal = await this._getHot(key);
    if (typeof hotVal !== "undefined") return hotVal;

    return this._getCold(key);
  }

  async set(key: string, value: Buffer): Promise<void> {
    if (this.writableBin.dataSize + value.length > this.maxBinSize || 
      this.writableBin.count >= this.maxBinEntries ) {
      this.rotate();
    }

    this.writableBin.set(key, value);
  }

  rotate() {
    this.coldBin?.close();

    this.coldBin = this.writableBin;
    this.writableBin = this.protectedBin;
    this.protectedBin = this.newCache();
  }

  close() {
    this.coldBin?.close()
    this.writableBin.close();
    this.protectedBin.close();
  }

  async delete(key: string | Buffer) {
    await Promise.all([
      this.coldBin?.delete(key),
      this.writableBin.delete(key),
      this.protectedBin.delete(key)
    ]);
  }
}

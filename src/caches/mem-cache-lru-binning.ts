import MegaHash from "megahash";
import { toMebibytes, toGibibytes } from "../util/units";
import { SynchronousCache } from ".";

/**
 * A cache designed to mimick LRU but with O(1) reads and writes.
 *
 * The cache contains three bins, a `protectedBin`, `writableBin`, and `frozenBin`.
 * Each is a MegaHash which stores large blobs outside of V8's heap.
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
 * - the frozenBin is scheduled to be cleared in the nextTick (unless it is garbage collected before then)
 * - the protectedBin becomes the writableBin
 * - the writableBin becomes the frozenBin
 */
export default class MemCacheLRUBinning implements SynchronousCache {
  cacheType: "sync" = "sync";

  protectedBin: MegaHash;
  writableBin: MegaHash;
  frozenBin?: MegaHash;

  maxBinSize: number; // in bytes
  maxProtectedBinSize: number;

  /**
   *
   * @param maxDataSize The maximum size, in bytes, for each bin.
   * The cache will store up to 2 times this amount of memory and use upto twice this memor
   */
  constructor(maxBinSize = toMebibytes(50), minWritablePortion = 0.2) {
    this.maxBinSize = maxBinSize;
    this.maxProtectedBinSize = this.maxBinSize * (1 - minWritablePortion);

    this.writableBin = new MegaHash();
    this.protectedBin = new MegaHash();
  }

  get(_key: string): Buffer | undefined {
    const key = Buffer.from(_key, "utf-8");

    const pV = this.protectedBin.get(key) as Buffer;
    if (typeof pV !== "undefined") return pV;

    const wV = this.writableBin.get(key) as Buffer;
    if (typeof wV !== "undefined") return wV;

    if (typeof this.frozenBin !== "undefined") {
      const v = this.frozenBin.get(key) as Buffer;
      if (typeof v === "undefined") return undefined;

      if (
        this.protectedBin.stats().dataSize + v.length >
        this.maxProtectedBinSize
      ) {
        this.rotate();
      }

      this.protectedBin.set(key, v);
      this.frozenBin.delete(key);

      return v;
    }

    return undefined;
  }

  set(key: string, value: Buffer): boolean {
    if (this.writableBin.stats().dataSize + value.length > this.maxBinSize) {
      this.rotate();
    }
    const status = this.writableBin.set(key, value);
    if (status > 0) {
      return true;
    } else {
      throw new Error("Failed to set MemCacheLRUBinning key: " + key);
    }
  }

  rotate() {
    if (typeof this.frozenBin !== "undefined") {
      // clear the bin to force garbage collection, but we'll wait until the next tick to do so to avoid slowing the current request
      ClearMegaHash.clearHashLater(this.frozenBin);
    }

    this.frozenBin = this.writableBin;
    this.writableBin = this.protectedBin;
    this.protectedBin = new MegaHash();
  }
}

namespace ClearMegaHash {
  const megahashKey = {};

  type WeakMegaHash = WeakMap<object, MegaHash | undefined>;

  export const clearHashLater = (hash: MegaHash) => {
    let weak: WeakMegaHash = new WeakMap();
    weak.set(megahashKey, hash);
    process.nextTick(_weaklyClearHash.bind(null, weak));
  };

  const _weaklyClearHash = (weak: WeakMegaHash) => {
    const hash = weak.get(megahashKey);
    if (typeof hash !== "undefined") hash.clear();
  };
}

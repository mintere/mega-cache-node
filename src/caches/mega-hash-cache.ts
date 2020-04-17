import LRUBinningCache from "./lifecycles/lru-binning";
import { toMebibytes } from "../util/units";
import { SynchronousCache } from "./abstract";
import MegaHash from "megahash";

/**
 * @private
 */
export const clearHashLater = (() => {
  const megahashKey = {};
  type WeakMegaHash = WeakMap<object, MegaHash | undefined>;
  
  const _weaklyClearHash = (weak: WeakMegaHash) => {
    const hash = weak.get(megahashKey);
    if (typeof hash !== "undefined") hash.clear();
  };

  return function clearHashLater(hash: MegaHash) {
    let weak: WeakMegaHash = new WeakMap();
    weak.set(megahashKey, hash);
    process.nextTick(_weaklyClearHash.bind(null, weak));
  };
})()

/**
 * A wrapped [megahash] with no lifecycle strategy (values exist permanently until deleted).
 * 
 * [megahash]: https://github.com/jhuckaby/megahash
 */
class MegaHashCache implements SynchronousCache {
  cacheType: "sync" = "sync";
  
  get dataSize(): number {
    const stats = this.megahash.stats();
    return stats.dataSize + stats.indexSize;
  }
  get count(): number {
    return this.megahash.length();
  };

  megahash: MegaHash;

  constructor() {
    this.megahash = new MegaHash();
  }

  get(key: string | Buffer): Buffer {
    return this.megahash.get(key) as Buffer;
  }

  set(key: string | Buffer, value: Buffer): void {
    const status = this.megahash.set(key, value);

    if(status == 0) throw new Error("Failed to set value to MegaHash. Likely out of memory.");
  }

  delete(key: string | Buffer): void {
    this.megahash.delete(key);
  }

  close(): void {
    clearHashLater(this.megahash);
    delete this.megahash;
  }
}

namespace MegaHashCache {
  /**
   * An implementation of a [[`LRUBinningCache`]] using a Mega Hash.
   * 
   * It's generally better to use a [[`MemCacheLRU`]] (performance is slightly better as LRU binning caches experience GC spikes)
   */
  export class LRUBinning extends LRUBinningCache {
    constructor(maxBinSize = toMebibytes(50), maxBinEntries = 10000, minWritablePortion = 0.2) {
      super(maxBinSize, maxBinEntries, minWritablePortion, () => new MegaHashCache());
    }
  }
}

export default MegaHashCache;
import CacheStack from "./cache-stack";
import FSCache from "./caches/fs-cache";
import MemCacheLRU from "./caches/mem-cache-lru";
import { CacheSource } from "./caches/source";

interface MegaCacheOptions {
  source: CacheSource;
  maxMemoryDataSize: number;
  cacheDir: string;
  maxFSSizePerBin: number;
  maxFSEntriesPerBin: number;
  minFSBinWritablePortion?: number;
}

/**
 * It's **the** flagship cache of the library.
 *
 * An LRU in-memory cache backed by a LRUBinning file system cache.
 * 
 * Make sure to `close()` after use to remove the cache files.
 */
export default class MegaCache extends CacheStack {
  /**
   * @param source A [[`cacheSource`]] to fallback to.
   * @param maxMemoryDataSize The maximum amount of RAM to use for caching
   * @param cacheDir Where to store files on disk
   * @param maxFSSizePerBin How large a file bin can be on disk before rotation. We can store upto 3x this.
   * @param maxFSEntriesPerBin How many files max to store on disk per bin before rotation. We can store upto 3x this.
   * @param minFSBinWritablePortion 
   * A configuration option for the LRUBinning cache algorithm.
   * Sets the minimum portion of items to be cleared between cache rotations.
   * There must be space available in order for cache fills to occur.
   */
  constructor({
    source,
    maxMemoryDataSize,
    cacheDir,
    maxFSSizePerBin,
    maxFSEntriesPerBin,
    minFSBinWritablePortion = 0.2,
  }: MegaCacheOptions) {
    const memCache = new MemCacheLRU(maxMemoryDataSize);

    const fsCache = new FSCache.LRUBinning(
      cacheDir,
      maxFSSizePerBin,
      maxFSEntriesPerBin,
      minFSBinWritablePortion
    );

    super(memCache, fsCache, source);
  }
}

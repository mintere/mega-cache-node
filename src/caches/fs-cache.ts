import { toMebibytes } from "../util/units";
import { AsyncronousCache } from "./abstract";
import cacache from "cacache";

import LRUBinningCache from "./lifecycles/lru-binning";
import { promises as fs } from "fs";

/**
 * A file system cache (with no lifecycle management) based on npm's [cacache](https://github.com/npm/cacache#readme).
 * 
 * Make sure to `close()` after use to remove the cache files.
 * 
 * @see [[`FSCache.LRUBinning`]] for a pseudo-LRU Binnning lifecycle-managed file system cache.
 */
class FSCache implements AsyncronousCache {
  cacheType: "async" = "async";

  cacheDir: string | Promise<string>;

  constructor(cacheDir: string | Promise<string>) {
    this.cacheDir = cacheDir;
  }

  static withTmpDir(cacheDir: string) {
    return new FSCache(cacache.tmp.mkdir(cacheDir, { tmpPrefix: "" }));
  }

  dataSize = 0;
  count = 0;

  async set(key: string | Buffer, value: Buffer) {
    if (typeof key !== "string") key = key.toString();

    try {
      const existing = await cacache.get(await this.cacheDir, key);
      this.dataSize -= existing.size
    } catch (e) {
      if (e.code !== "ENOENT") throw e;
      this.count += 1;
    }
    
    this.dataSize += value.length;

    await cacache.put(await this.cacheDir, key.toString(), value);
  }

  async get(key: string | Buffer) {
    try {
      const { data } = await cacache.get(await this.cacheDir, key.toString());
      return data;
    } catch (e) {
      if (e.code === "ENOENT") return;
      throw e;
    }
  }

  async delete(key: string | Buffer) {
    if (typeof key !== "string") key = key.toString();

    try {
      const existing = await cacache.get(await this.cacheDir, key);
      this.dataSize -= existing.size || 0;
      this.count -= 1;

      await Promise.all([
        cacache.rm(await this.cacheDir, key),
        cacache.rm.entry(await this.cacheDir, existing.integrity)
      ])
    } catch (e) {
      if (e.code !== "ENOENT") throw e;
    }
  }

  async close() {
    await cacache.rm.all(await this.cacheDir);
    this.dataSize = 0;
    this.count = 0;

    delete this.set;
    delete this.get;

    try {
      await fs.rmdir(await this.cacheDir + "/tmp");
      await fs.rmdir(await this.cacheDir);
    } catch (e) {
      if (e.code !== "ENOENT") throw e;
    }
  }
}


namespace FSCache {
  /**
   * A file system cache based on npm's [cacache](https://github.com/npm/cacache#readme) using [[`LRUBinning`]] for lifecycle management.
   * 
   * Make sure to `close()` after use to remove the cache files.
   */
  export class LRUBinning extends LRUBinningCache {
    constructor(
      cacheDir: string,
      maxBinSize = toMebibytes(50),
      maxBinEntries = 10000,
      minWritablePortion = 0.2
    ) {
      super(maxBinSize, maxBinEntries, minWritablePortion, () => FSCache.withTmpDir(cacheDir));
    }
  }
}

export default FSCache;



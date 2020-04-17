import Cache, { AsyncronousCache } from "./caches/abstract";
import { CacheSource } from "./caches/source";

/**
 * A stack of caches.
 *
 * When retrieving values, we look for them in each cache in the stack.
 * If a cache misses, the next [[`Cache`]] or [[`CacheSource`]] is checked.
 * Once a value is found, we fill all caches earlier in the stack.
 *
 * Used to create multi-layered caches.
 * 
 * @see [[`MegaCache`]] for our recommended cache stack.
 */
export default class CacheStack implements AsyncronousCache {
  cacheType: "async" = "async";

  stack: (Cache | CacheSource)[];

  get dataSize() {
    return this.stack.reduce(
      (sum, cache) =>
        sum +
        (cache.cacheType == "sync" || cache.cacheType == "async"
          ? cache.dataSize
          : 0),
      0
    );
  }

  get count() {
    return this.stack.reduce(
      (sum, cache) =>
        sum +
        (cache.cacheType == "sync" || cache.cacheType == "async"
          ? cache.count
          : 0),
      0
    );
  }

  constructor(...stack: (Cache | CacheSource)[]) {
    this.stack = stack;
  }

  async delete(key: string | Buffer) {
    await Promise.all(
      this.stack.map(async (cache) => {
        if (cache.cacheType !== "source") await cache.delete(key);
      })
    );
  }

  async close() {
    await Promise.all(
      this.stack.map(async (cache) => {
        if (cache.cacheType !== "source") await cache.close();
      })
    );
  }

  async get(key: string): Promise<Buffer | undefined> {
    let cachesWithMisses: Cache[] = [];

    let val: Buffer | undefined;

    for (const cache of this.stack) {
      val = await cache.get(key);

      if (typeof val === "undefined") {
        if (cache.cacheType !== "source") cachesWithMisses.push(cache);
      } else {
        await Promise.all(
          cachesWithMisses.map((c) => c.set(key, val as Buffer))
        );

        return val;
      }
    }

    return;
  }

  async set(key: string, value: Buffer): Promise<void> {
    await Promise.all(
      this.stack.map((stack) =>
        stack.set ? stack.set(key, value) : Promise.resolve()
      )
    );
  }
}

import Cache, { CacheSource, AsyncronousCache } from "./caches";

export default class CacheStack implements AsyncronousCache {
  cacheType: "async";

  stack: (Cache | CacheSource)[];

  constructor(...stack: (Cache | CacheSource)[]) {
    this.stack = stack;
  }

  async get(key: string): Promise<Buffer> {
    let cachesWithMisses = [];

    let val: Buffer | undefined;

    for (const cache of this.stack) {
      val = await cache.get(key);

      if (typeof val === "undefined") {
        cachesWithMisses.push(cache);
      } else {
        await Promise.all(cachesWithMisses.map(() => cache.set(key, val)));
        break;
      }
    }

    return val;
  }

  async set(key: string, value: Buffer): Promise<void> {
    await Promise.all(
      this.stack.map((stack) =>
        stack.set ? stack.set(key, value) : Promise.resolve()
      )
    );
  }
}

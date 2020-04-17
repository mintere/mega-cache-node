import MegaHash from "megahash";
import { toMebibytes } from "../util/units";
import { SynchronousCache } from "./abstract";
import {clearHashLater} from "./mega-hash-cache";

/**
 * An in-memory LRU cache, implemented using a doubly-linked list.
 * 
 * @example
 * 
 * ```js
 * import { MemCacheLRUBinning, toGibibytes } from "mega-cache";
 *
 * const maxDataSize = toGibibytes(1);
 * 
 * let cache = new MemCacheLRU(
 *   maxDataSize // defaults to 150MiB
 * );
 * cache.set("key", Buffer.from("value"));
 * cache.get("key").toString(); //=> "value"
 * 
 * cache.get(cache.tail).toString() //=> "value"
 * cache.pop() //=> "key"
 * cache.pop() //=> undefined
 * ```
 */
export default class MemCacheLRU implements SynchronousCache {
  cacheType: "sync" = "sync";

  hashTable: MegaHash;

  forwardsLinks: MegaHash;
  backwardsLinks: MegaHash;

  head?: Buffer;
  tail?: Buffer;

  maxDataSize: number; // in bytes

  /**
   * @param maxDataSize The cache is limited to this data size. Setting large values is potentially O(n), where n is the number of objects which must be removed to make room for the new value. Setting a value that is too large for the cache is O(n) and will result in an error being throw. For performance, you should protect against this in your code.
   */
  constructor(maxDataSize = toMebibytes(150)) {
    this.maxDataSize = maxDataSize;

    this.hashTable = new MegaHash();
    this.forwardsLinks = new MegaHash();
    this.backwardsLinks = new MegaHash();
  }

  delete(key: string | Buffer): void | Promise<void> {
    if (typeof key === "string") key = Buffer.from(key, "utf-8");

    const prevKey = this.backwardsLinks.get(key) as Buffer | undefined;

    if (typeof prevKey !== "undefined") 
      this.spliceKeys(prevKey, this.forwardsLinks.get(key) as Buffer | undefined)

    this.hashTable.delete(key);
    this.backwardsLinks.delete(key);
    this.forwardsLinks.delete(key);
  }

  close(): void | Promise<void> {
    clearHashLater(this.hashTable)
    clearHashLater(this.backwardsLinks)
    clearHashLater(this.forwardsLinks)
    
    delete this.hashTable;
    delete this.backwardsLinks;
    delete this.forwardsLinks;
  }

  get dataSize() {
    const stats = this.hashTable.stats();
    return stats.dataSize + stats.indexSize;
  }

  get count() {
    return this.hashTable.length();
  }

  get(key: Buffer | string): Buffer | undefined {
    if (typeof key === "string") key = Buffer.from(key, "utf-8");

    const v = this.hashTable.get(key) as Buffer | undefined;

    if (typeof v !== "undefined") {
      this.shiftKeyToHead(key);
    }

    return v;
  }

  shiftKeyToHead(key: Buffer) {
    if (this.head === key) return;

    const nextKey = this.forwardsLinks.get(key) as Buffer | undefined;
    const prevKey = this.backwardsLinks.get(key) as Buffer | undefined;

    // move to start of queue
    if (typeof this.head === "undefined") {
      // first item
      this.tail = key;
    } else {
      this.forwardsLinks.set(key, this.head);
      this.backwardsLinks.set(this.head, key);
    }
    this.head = key;
    this.backwardsLinks.delete(key);

    if (typeof prevKey !== "undefined") 
      this.spliceKeys(prevKey, nextKey)
  }

  private spliceKeys(backKey: Buffer, forwardKey: Buffer | undefined) {
    if (typeof forwardKey === "undefined") {
      // this used to be the tail, make the previous key the new tail
      this.forwardsLinks.delete(backKey);
      this.tail = backKey;
    } else {
      // splice by skipping over this key
      this.forwardsLinks.set(backKey, forwardKey);
      this.backwardsLinks.set(forwardKey, backKey);
    }
  }

  _pop(): Buffer | undefined {
    if (typeof this.tail === "undefined") return;

    const key = this.tail;
    this.hashTable.delete(key);

    const prevKey = this.backwardsLinks.get(key) as Buffer | undefined;

    if (typeof prevKey === "undefined") {
      if(this.head === this.tail) this.head = undefined;
    } else {
      this.backwardsLinks.delete(key);
      this.forwardsLinks.delete(prevKey);
    }

    this.tail = prevKey;

    return key;
  }

  pop() {
    return this._pop()?.toString();
  }

  set(key: Buffer | string, value: Buffer): boolean {
    if (typeof key === "string") key = Buffer.from(key, "utf-8");

    while (this.dataSize + value.length > this.maxDataSize) {
      if (!this._pop())
        throw new Error("Failed to save to queue, likely due to size.");
    }

    this.hashTable.set(key, value);
    this.shiftKeyToHead(key);

    return true;
  }

  *[Symbol.iterator]() {
    let key: Buffer | undefined = this.head;
    while (typeof key !== "undefined") {
      yield key;
      key = this.forwardsLinks.get(key) as Buffer | undefined;
    }
  }
}

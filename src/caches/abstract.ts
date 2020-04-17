interface BaseCache {
  readonly dataSize: number;
  readonly count: number;

  get(key: string | Buffer): Promise<Buffer | undefined> | Buffer | undefined;
  set(key: string | Buffer, value: Buffer): void;

  delete(key: string | Buffer): void | Promise<void>;
  close(): void | Promise<void>;
}

export interface SynchronousCache extends BaseCache {
  cacheType: "sync"

  get(key: string | Buffer): Buffer | undefined;
}

export interface AsyncronousCache extends BaseCache {
  cacheType: "async"

  set(key: string | Buffer, value: Buffer): Promise<void>;
}

export type Cache = SynchronousCache | AsyncronousCache;

export default Cache;

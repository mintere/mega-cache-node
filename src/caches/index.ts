export interface SynchronousCache {
  cacheType: "sync"

  get(key: string): Buffer | undefined;
  set(key: string, value: Buffer): void;
}

export interface AsyncronousCache {
  cacheType: "async"

  get(key: string): Promise<Buffer | undefined> | undefined;
  set(key: string, value: Buffer): Promise<void>;
}

export interface SyncSource {
  cacheType: "syncSource"

  get(key: string): Buffer | undefined
  set: never
}

export interface AsyncSource {
  cacheType: "asyncSource"

  get(key: string): Promise<Buffer | undefined> | undefined
  set: never
}

export type CacheSource = SyncSource | AsyncSource;

export type Cache = SynchronousCache | AsyncronousCache;

export default Cache;
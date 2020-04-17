/** An async function which takes a key and returns a `Buffer`. */
type CacheFiller = (key: string) => Promise<Buffer | undefined> | Buffer | undefined

/**
 * A cache source (to use as a fallback for cache misses). See [[`cacheSource`]] to create one.
 */
export interface CacheSource {
  cacheType: "source"

  get: CacheFiller
  set?: never
}

/**
 * Wraps a cache filler function into the object needed for the library to recognize it as a cache source.
 * 
 * @param filler An async function which takes a key and returns a `Buffer`.
 */
export function cacheSource(filler: CacheFiller): CacheSource {
  return {
    cacheType: "source",
    get: filler
  }
}

# Mega Cache
 
A speedy & extensible library designed for caching large numbers of large blobs in memory and on disk. 
Used heavily in production by [Mintere](https://mintere.com) for serving web content at scale.

Based on jhuckaby's [megahash].

## Install

```sh
npm i --save mega-cache
```

or

```sh
yarn add mega-cache
```

## Usage

You'll probably want to use the `MegaCache` - it's the flagship cache of the library, and for good reason.
The `MegaCache` caches in both memory and disk and automatically takes care of expiring the least recently
used entries.

Values must be `Buffer`s. 

Keys must be `string`s or `Buffer`s.

```ts
import {MegaCache, cacheSource, MiB} from "mega-cache";

const source = cacheSource(async (key) => {
  console.log("loading key...");
  return Buffer.from("*".repeat(10 * MiB))
}); 

const cache = new MegaCache({
  source: source,
  maxMemoryDataSize: 25 * MiB, // The maximum amount of RAM to use for caching.
  cacheDir: ".cache",          // Which directory to use for disk cache.
  maxFSBinSize: 60 * MiB,      // Use up-to 3x this amount of disk space.
  maxFSEntries: 10,            // Use up-to 3x this number of files.
});

cache.get("test") //=> Buffer, Prints "Loading Key"
cache.get("test") //=> Buffer
cache.get("test-1") //=> Buffer, Prints "Loading Key"
```

## License

> Copyright © 2020 Mintere LLC, All rights reserved.
>
> This library is free software; you can redistribute it and/or modify it under the
> terms of the [GNU Lesser General Public License](LICENSE) as published by the Free
> Software Foundation; either version 3.0 of the License, or (at your option) any later version.
>
> This library is distributed in the hope that it will be useful,
> but WITHOUT ANY WARRANTY; without even the implied warranty of
> MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
> Lesser General Public License for more details.

[megahash]: https://github.com/jhuckaby/megahash

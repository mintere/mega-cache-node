# Mega Cache
 
A speedy & extensible library designed for caching large numbers of large blobs in memory and on disk. 
Used heavily in production by Mintere for serving web content at scale.

Based on jhuckaby's [megahash] - data is stored off the the v8 heap.

## Install

```sh
npm i --save mega-cache
```

or

```sh
yarn add mega-cache
```

## Caches


### MemCacheLRUBinning

An in-memory cache designed to mimick LRU but with O(1) reads and writes.

The cache contains three bins, a `protectedBin`, `writableBin`, and `frozenBin`. 
Each is a [`MegaHash`][megahash] which stores large blobs outside of V8's heap.

When writing to the cache, we first check to make sure there is room (`maxBinSize`).
If there is not enough space, we rotate the bins before setting the value.

When reading the cache, we first look for the value in the protected bin.
If the key is in the protected bin, return the value, otherwise check the writable bin.
If the key is in the writable bin, return the value, otherwise check the frozen bin.
If the key is in the frozen bin, move the value to the protected bin and return the value
Otherwise, returns undefined.

Rotates are O(1), clearing is O(n) and scheduled for the nextTick after rotation.
During a rotate:
- the frozenBin is scheduled to be cleared in the nextTick (unless it is garbage collected before then- the protectedBin becomes the writableBin
- the writableBin becomes the frozenBin

```js
import { MemCacheLRUBinning, toMebibytes } from "mega-cache";

const maxBinSize = toMebibytes(256); // The cache can store upto 2 times this amount, and potentially peak at 3 times prior to GC
const minWritablePortion = 0.2; // What portion of the writable bin should be reserved for new data

let cache = new MemCacheLRUBinning(
  maxBinSize, // defaults to 50MiB
  minWritablePortion // defaults to 0.2
);
cache.set("key", Buffer.from("value"));
cache.get("key").toString(); //=> "value"
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

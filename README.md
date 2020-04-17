# Mega Cache
 
A speedy & extensible library designed for caching large numbers of large blobs in memory and on disk. 
Used heavily in production by Mintere for serving web content at scale.

Based on jhuckaby's [megahash](https://github.com/jhuckaby/megahash) - data is stored off the the v8 heap.

## Install

```sh
npm i --save mega-cache
```

or

```sh
yarn add mega-cache
```

## Usage


### MemCacheLRUBinning

```js
import { MemCacheLRUBinning } from "mega-cache";

let cache = new MemCacheLRUBinning();
cache.set("key", Buffer.from("value"));
cache.get("key").toString(); //=> "value"
```
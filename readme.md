

<a align="right" href="https://travis-ci.org/ORESoftware/express.fs.cache">
    <img align="right" alt="Travis Build Status" src="https://travis-ci.org/ORESoftware/express.fs.cache.svg?branch=master">
</a>

<br>

<a align="right" href="https://circleci.com/gh/ORESoftware/express.fs.cache">
    <img align="right" alt="CircleCI Build Status" src="https://circleci.com/gh/ORESoftware/express.fs.cache.png?branch=master&circle-token=8ee83a1b06811c9a167e71d12b52f8cf7f786581">
</a>

<br>

<a align="right" href="https://www.npmjs.com/package/@oresoftware/fast.static">
<img align="right" alt="Latest NPM version" src="https://img.shields.io/npm/v/@oresoftware/fast.static.svg?colorB=green">
</a>

<br>

# @oresoftware/fast.static

> Use Express middleware to cache and serve static assets from memory, not disk.
> A good optimization for production servers.
> Will tell you how big the cache is, in bytes, in memory.

### Installation:

>
> `npm i @oresoftware/fast.static`
>

## Example

```js

import * as express from 'express';
import statikCache from '@oresoftware/fast.static';

if(process.env.in_production === 'yes'){
  app.use('/public', statikCache('public'));
}

app.use('/public', express.static('public'));

```

# In Development

In development, if you re-load the server on changes to front-end static assets, then you don't really
need the env variable check. Otherwise, I would only use this in the production.

If the files are in the cache, they will get served by the cache.
Given the above code, we would cache all `.js`, `.html`, `.css` files in the public directory.
The cached files would be served from an in-memory cache.

If for some reason, a file is not in the cache, then the regular express static middleware would
pick up where we left off.

This middleware never calls `next(err)`, only `next()`.

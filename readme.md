

<a align="right" href="https://travis-ci.org/ORESoftware/live-mutex">
    <img align="right" alt="Travis Build Status" src="https://travis-ci.org/ORESoftware/live-mutex.svg?branch=dev">
</a>

<br>

<a align="right" href="https://circleci.com/gh/ORESoftware/live-mutex">
    <img align="right" alt="CircleCI Build Status" src="https://circleci.com/gh/ORESoftware/live-mutex.png?branch=dev&circle-token=8ee83a1b06811c9a167e71d12b52f8cf7f786581">
</a>

<br>

<a align="right" href="https://www.npmjs.com/package/live-mutex">
<img align="right" alt="Latest NPM version" src="https://img.shields.io/npm/v/live-mutex.svg?colorB=green">
</a>

<br>

# @oresoftware/fast.static

> Use Express middleware to cache and serve static assets

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

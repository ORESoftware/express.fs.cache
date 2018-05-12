

# @oresoftware/express.fs.cache

## Use Express middleware to cache and serve static assets 


```js

import express = require('express');
import cacheAndServe from '@oresoftware/express.fs.cache';


app.use('/public', cacheAndServe(path.join(__dirname, 'public')));
app.use('/public', express.static(path.join(__dirname, 'public')));


```

If the files are in the cache, they will get served by the cache.
By default, we would cache all .js, .html, .css files in the public directory.
The cached files would be served from an in-memory cache.

If for some reason, a file is not in the cache, then the regular express static middleware would
pick up where we left off. 

This middleware never calls `next(err)`, only `next()`.

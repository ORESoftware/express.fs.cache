import express = require('express');
import {statikCache} from '../dist/main';
import {ErrorRequestHandler} from "express";
import path = require('path');

const app = express();

// statikCache.on('info', function () {
//   console.log.call(console, 'static cache info:', ...arguments);
// });

const c = statikCache('fixtures', {debug: true});

c.emitter.on('ege', (r: any) => console.log(r));

app.use('/fixtures', c);

app.use(function (req, res, next) {
  next(new Error('404'));
});

app.use(<ErrorRequestHandler>function (err, req, res, next) {
  res.json({error: (err && err.stack || err.message) || null});
});

const port = 4005;

app.listen(port, () => {
  console.log('Listening on port:', port);
});

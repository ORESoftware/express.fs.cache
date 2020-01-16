import express = require('express');
// import {statikCache} from '../dist/main';
import {ErrorRequestHandler} from "express";
import path = require('path');

const app = express();

// statikCache.on('info', function () {
//   console.log.call(console, 'static cache info:', ...arguments);
// });

import statikCache from '@oresoftware/fast.static';

if(process.env.we_in_production === 'yes'){
  app.use('/public', statikCache('public'));
}

app.use('/public', express.static('public'));



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

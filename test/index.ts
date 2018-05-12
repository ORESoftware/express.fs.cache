import express = require('express');
import {statikCache} from '../dist';
import {ErrorRequestHandler} from "express";
import path = require('path');

const app = express();

statikCache.on('info', function () {
  console.log.call(console, 'static cache info:', ...arguments);
});

app.use(statikCache(path.join(__dirname, 'fixtures'), {debug: true}));

app.use(function (req, res, next) {
  next(new Error('404'));
});

app.use(<ErrorRequestHandler>function (err, req, res, next) {
  res.json({error: (err && err.stack || err.message) || null});
});

app.listen(4005);

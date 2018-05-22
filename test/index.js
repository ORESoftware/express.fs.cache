"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
const dist_1 = require("../dist");
const path = require("path");
const app = express();
dist_1.statikCache.on('info', function () {
    console.log.call(console, 'static cache info:', ...arguments);
});
app.use(dist_1.statikCache(path.join(__dirname, 'fixtures'), { debug: true }));
app.use(function (req, res, next) {
    next(new Error('404'));
});
app.use(function (err, req, res, next) {
    res.json({ error: (err && err.stack || err.message) || null });
});
app.listen(4005);

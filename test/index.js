"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
const main_1 = require("../dist/main");
const app = express();
const c = main_1.statikCache('fixtures', { debug: true });
c.emitter.on('ege', (r) => console.log(r));
app.use('/fixtures', c);
app.use(function (req, res, next) {
    next(new Error('404'));
});
app.use(function (err, req, res, next) {
    res.json({ error: (err && err.stack || err.message) || null });
});
const port = 4005;
app.listen(port, () => {
    console.log('Listening on port:', port);
});

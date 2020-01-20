'use strict';

import {NextFunction, Request, RequestHandler, Response} from "express";
import chalk from "chalk";
import {getCleanTrace} from "clean-trace";
import * as fs from "fs";
import * as path from "path";
import parseUrl = require('parseurl');
import {makeFunctionEmitter, FunctionEmitter} from "./utils";
import fresh = require('fresh');
import * as assert from "assert";
import * as EventEmitter from 'events';

const log = {
  info: console.log.bind(console, chalk.gray.bold('@oresoftware/express.fs.cache:')),
  error: console.error.bind(console, chalk.magentaBright.underline('@oresoftware/express.fs.cache error:')),
  warn: console.error.bind(console, chalk.yellow.bold('@oresoftware/express.fs.cache warning:'))
};

export interface StatikCacheOpts {
  base?: string,
  debug?: boolean
}

export interface StatikCacheMethods {
  [index: string]: boolean;
}

export interface StatikCacheEmitter extends FunctionEmitter {
  (p: string | StatikCacheOpts, opts?: StatikCacheOpts): RequestHandler
}

const eventName = 'express.fs.cache';

const isFresh = function (method: string, req: Request, res: Response) {

  const status = res.statusCode;

  if (!status) {
    res.statusCode = 200;
  }

  // GET or HEAD for weak freshness validation only
  if ('GET' !== method && 'HEAD' !== method) {
    return false;
  }

  // 2xx or 304 as per rfc2616 14.26
  if ((status >= 200 && status < 300) || 304 === status) {
    return fresh(req.headers, {
      'etag': res.get('ETag'),
      'last-modified': res.get('Last-Modified')
    });
  }

  return false;
};

export const statikCache = <StatikCacheEmitter>function (p, opts) {

  let basePath = '';

  if (p && typeof p === 'object') {
    opts = p as StatikCacheOpts;
    basePath = opts.base || '';
    assert.strictEqual(typeof basePath, 'string', 'The path passed to statik cache as opts.base not a string.');
  } else {
    basePath = p as string;
    assert.strictEqual(typeof basePath, 'string', 'The path passed to statik cache is not a string.');
  }

  if(!path.isAbsolute(basePath)){
    log.warn('Prefer an absolute path, resolving this path with PWD:', basePath);
    basePath = path.resolve(process.cwd() + '/' + basePath);
  }

  assert.strictEqual(true, fs.statSync(basePath).isDirectory(), 'The base-path is not a directory.');
  opts = opts || {} as StatikCacheOpts;

  const debug = opts.debug || false;
  let isSelfLog = false;

  const cache = new Map<string, string>();
  const extensions = ['.js', '.css', '.html'];
  const matchesExtensions = (s: string) => extensions.some((ext) => s.endsWith(ext));
  const badPaths = ['/.git/', '/node_modules/', '/.idea/'];
  const matchesBadExtensions = (s: string) => badPaths.some((ext) => s.endsWith(ext));
  let totalBytes = 0;

  const loadFilesWithinDir = (p: string): void => {

    if (matchesBadExtensions(p)) {
      log.warn('Could not search the following dir because it ended with a blacklisted path:', p);
      return;
    }

    if (matchesBadExtensions(p + '/')) {
      log.warn('Could not search the following dir because it ended with a blacklisted path:', p);
      return;
    }

    const items = fs.readdirSync(p);

    for (let item of items) {

      const i = path.resolve(p, item);
      const fd = fs.openSync(i, 'r');
      const s = fs.fstatSync(fd);

      if (s.isDirectory()) {
        loadFilesWithinDir(i);
        continue;
      }

      if (!s.isFile()) {
        log.warn('Filepath within stakik cache dir is not a file:', i);
        continue;
      }

      if (!matchesExtensions(i)) {
        log.warn('The following file was ignored by statik-cache:', i);
        continue;
      }

      try {
        let d = String(fs.readFileSync(i));
        cache.set(i, d);
        totalBytes += Buffer.byteLength(d, 'utf8');
      } catch (e) {
        log.warn(e);
      }
    }
  };

  loadFilesWithinDir(basePath);
  log.info('Done creating statik cache.');
  log.info('This many files are in the cache:', cache.size);
  log.info('Total size of cache in bytes:', totalBytes);

  const methods = <StatikCacheMethods>{
    'HEAD': true,
    'GET': true
  };


  const f : RequestHandler = (req: Request, res: Response, next: NextFunction) => {

    const method = String(req.method || '').trim().toUpperCase();

    if (!methods[method]) {
      return next();
    }

    if (isFresh(method, req, res)) {
      log.info('we got a fresh one!', req.path);
      res.statusCode = 304;
    }

    if (204 === res.statusCode || 304 === res.statusCode) {

      if (debug) {
        isSelfLog ? log.info('sending a 204/304 for path:', req.path) :
          (f as any).emitter.emit(eventName, 'sending a 204/304 for path:', req.path);
      }

      res.removeHeader('Content-Type');
      res.removeHeader('Content-Length');
      res.removeHeader('Transfer-Encoding');
      return res.end('');
    }

    const originalUrl = parseUrl.original(req);

    let absFilePath = parseUrl(req).pathname;
    // make sure redirect occurs at mount
    if (absFilePath === '/' && originalUrl.pathname.substr(-1) !== '/') {
      absFilePath = ''
    }

    absFilePath = path.resolve(basePath + '/' + absFilePath);

    if (cache.has(absFilePath)) {

      if (debug) {
        isSelfLog ? log.info('using cache for file:', absFilePath) :
          (f as any).emitter.emit(eventName, 'using cache for file:', absFilePath);
      }

      // res.header('Cache-Control','private');
      // res.setHeader("Cache-Control", "private, max-age=2592000");
      // res.setHeader("Expires", new Date(Date.now() + 2592000000).toUTCString());

      res.removeHeader('Cache-Control');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

      res.end(cache.get(absFilePath));
      log.info('Served the following file from the cache:', absFilePath);
      return;
    }

    if (debug) {
      isSelfLog ?
        log.warn('*not* using cache for file:', absFilePath) :
        (f as any).emitter.emit(eventName, '*not* using cache for file:', absFilePath);
    }

    next();

  };

  (f as any).emitter = new EventEmitter();

  if (debug) {
    isSelfLog ? log.info('here are the files in the cache:') :
      (f as any).emitter.emit(eventName, 'this many files are in the cache:', cache.size);
  }

  if (debug) {
    log.warn('we are debugging.');
    process.nextTick(function () {
      if ((f as any).emitter.listenerCount('info') < 1) {
        log.warn('to handle logging yourself, add an event listener for the event "info".');
        isSelfLog = true;
      }
    });
  }

  return f;

};

export default statikCache;

export const r2gSmokeTest = function () {
  return true;
};

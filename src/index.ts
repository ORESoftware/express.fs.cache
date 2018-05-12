'use strict';

import {RequestHandler} from "express";
import cp = require('child_process');
import chalk from "chalk";
import {getCleanTrace} from "clean-trace";
import async = require('async');
import {AsyncQueue} from "async";
import * as fs from "fs";
import * as path from "path";
import parseUrl = require('parseurl');

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

export interface StatikCache {
  [index: string]: string;
}

export const statikCache = function (p: string | StatikCacheOpts, opts?: StatikCacheOpts) {
  
  let basePath = '';
  if (p && typeof p == 'object') {
    opts = p as StatikCacheOpts;
    basePath = opts.base || ''
  }
  else {
    basePath = p as string;
  }
  
  opts = opts || {} as StatikCacheOpts;
  const cache = {} as StatikCache;
  let stdout = '';
  
  try {
    stdout = String(cp.execSync(` . "$HOME/.gmx/gmx.sh"; gmx waldo ${basePath};\n`) || '').trim();
  }
  catch (err) {
    log.error('cannot read contents in directory:', p);
    throw getCleanTrace(err);
  }
  
  const methods = <StatikCacheMethods>{
    'HEAD': true,
    'GET': true
  };
  
  const q = async.queue(function (task: any, cb) {
    task(cb);
  }, 5);
  
  const extensions = ['.js', '.css', '.html'];
  
  const matchesExtensions = function (s: string) {
    return extensions.some(function (ext) {
      return s.endsWith(ext);
    })
  };
  
  String(stdout).split('\n').map(v => String(v || '').trim())
    .filter(function (v) {
      if (v && matchesExtensions(v)) {
        return true;
      }
    })
    .forEach(function (v) {
      q.push(function (cb: any) {
        fs.readFile(v, function (err, data) {
          if (!err) cache[v] = String(data || '');
          cb(null);
        });
      });
    });
  
  q.drain = function () {
    const keys = Object.keys(cache);
    log.info('this many files are in the cache:', keys.length);
    if (opts.debug) {
      log.info('here are the files in the cache:');
      keys.forEach(function (k) {
        log.info(k);
      });
    }
  };
  
  return <RequestHandler>function (req, res, next) {
    
    const method = String(req.method).trim().toUpperCase();
    
    if (!methods[method]) {
      return next();
    }
    
    const originalUrl = parseUrl.original(req);
    
    let absFilePath = parseUrl(req).pathname;
    // make sure redirect occurs at mount
    if (absFilePath === '/' && originalUrl.pathname.substr(-1) !== '/') {
      absFilePath = ''
    }
    
    absFilePath = path.resolve(basePath + '/' + absFilePath);
    
    if (cache[absFilePath]) {
      log.info('using cache for file:', absFilePath);
      res.end('\n\n' + cache[absFilePath] + '\n');
      return;
    }
    
    log.warn('not using cache for file:', absFilePath);
    next();
    
    // try {
    //   res.sendFile(absFilePath);
    // }
    // catch (err) {
    //   next(err);
    // }
    //
  }
  
};

export default statikCache;

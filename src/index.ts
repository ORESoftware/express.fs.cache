'use strict';

import {Request, RequestHandler, Response} from "express";
import cp = require('child_process');
import chalk from "chalk";
import {getCleanTrace} from "clean-trace";
import async = require('async');
import {AsyncQueue} from "async";
import * as fs from "fs";
import * as path from "path";
import parseUrl = require('parseurl');
import EventEmitter = require('events');
import {makeFunctionEmitter, FunctionEmitter} from "./utils";
import fresh = require('fresh');

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

export interface StatikCacheEmitter extends FunctionEmitter {
  (p: string | StatikCacheOpts, opts?: StatikCacheOpts): RequestHandler
}

export const statikCache = makeFunctionEmitter(<StatikCacheEmitter>function (p, opts) {
  
  let basePath = '';
  if (p && typeof p === 'object') {
    opts = p as StatikCacheOpts;
    basePath = opts.base || ''
  }
  else {
    basePath = p as string;
  }
  
  opts = opts || {} as StatikCacheOpts;
  
  const debug = opts.debug || false;
  let isSelfLog = false;
  
  if (debug) {
    log.warn('we are debugging.');
    process.nextTick(function () {
      if (statikCache.listenerCount('info') < 1) {
        log.warn('to handle logging yourself, add an event listener for the event "info".');
        isSelfLog = true;
      }
    });
  }
  
  const eventName = 'express.fs.cache';
  const cache = {} as StatikCache;
  let stdout = '';
  
  try {
    stdout = String(cp.execSync(` . "$HOME/.gmx/gmx.sh"; gmx waldo -p ${basePath};\n`) || '').trim();
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
    .forEach(function (v) {
      if (v && matchesExtensions(v)) {
        log.info('all those files:', v);
        q.push(function (cb: any) {
          fs.readFile(v, function (err, data) {
            if (!err) (cache[v] = String(data || ''));
            cb(null);
          });
        });
      }
    });
  
  q.drain = function () {
    const keys = Object.keys(cache);
    log.info('this many files are in the cache:', keys.length);
    if (debug) {
      isSelfLog ? log.info('here are the files in the cache:') :
        statikCache.emit(eventName, 'this many files are in the cache:', keys.length);
      
      keys.forEach(function (k) {
        isSelfLog ? log.info(k) : statikCache.emit(eventName, k);
      });
    }
  };
  
  const isFresh = function (method: string, req: Request, res: Response) {
    
    const status = res.statusCode;
    
    // GET or HEAD for weak freshness validation only
    if ('GET' !== method && 'HEAD' !== method) {
      return false;
    }
    
    // 2xx or 304 as per rfc2616 14.26
    if ((status >= 200 && status < 300) || 304 === status) {
      return fresh(res.headers, {
        'etag': res.get('ETag'),
        'last-modified': res.get('Last-Modified')
      })
    }
    
    return false;
  };
  
  return <RequestHandler>function (req, res, next) {
    
    const method = String(req.method || '').trim().toUpperCase();
    
    if (!methods[method]) {
      return next();
    }
    
    if (isFresh(method, req, res)) {
      res.statusCode = 304;
    }
    
    if (204 === res.statusCode || 304 === res.statusCode) {
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
    
    if (cache[absFilePath]) {
      
      if (debug) {
        isSelfLog ? log.info('using cache for file:', absFilePath) :
          statikCache.emit(eventName, 'using cache for file:', absFilePath);
      }
      
      return res.end('\n\n' + cache[absFilePath] + '\n');
    }
    
    if (debug) {
      isSelfLog ?
        log.warn('not using cache for file:', absFilePath) :
        statikCache.emit(eventName, 'not using cache for file:', absFilePath);
    }
    
    next();
    
  }
  
});

export default statikCache;

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
import {WaldoSearch} from '@oresoftware/waldo';

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
  
  // let stdout = '';
  //
  // try {
  //   stdout = String(cp.execSync(` . "$HOME/.gmx/gmx.sh"; gmx waldo -p ${basePath};\n`) || '').trim();
  // }
  // catch (err) {
  //   log.error('cannot read contents in directory:', p);
  //   throw getCleanTrace(err);
  // }
  
  const matchesExtensions = function (s: string) {
    return extensions.some(function (ext) {
      return s.endsWith(ext);
    })
  };
  
  new WaldoSearch({
    path: basePath,
    matchesAnyOf: ['\\.js$', '\\.html$', '\\.css$'],
    matchesNoneOf: ['/\.git/', '/node_modules/', '/\.idea/']
  })
  .search(function (err, results) {
    
    if (err) {
      throw err;
    }
    
    async.eachLimit(results, 5, function (v, cb) {
        if (v && matchesExtensions(v)) {
          log.info('all those files:', v);
          fs.readFile(v, function (err, data) {
            err ? log.error(err) : (cache[v] = String(data || ''));
            cb(null);
          });
        }
      },
      function (err) {
        if (err) throw err;
        log.info('done loading files into memory.');
      });
  });
  
  const methods = <StatikCacheMethods>{
    'HEAD': true,
    'GET': true
  };
  
  // const q = async.queue(function (task: any, cb) {
  //   task(cb);
  // }, 5);
  
  const extensions = ['.js', '.css', '.html'];
  
  const keys = Object.keys(cache);
  log.info('this many files are in the cache:', keys.length);
  if (debug) {
    isSelfLog ? log.info('here are the files in the cache:') :
      statikCache.emit(eventName, 'this many files are in the cache:', keys.length);
    
    keys.forEach(function (k) {
      isSelfLog ? log.info(k) : statikCache.emit(eventName, k);
    });
  }
  
  const isFresh = function (method: string, req: Request, res: Response) {
    
    const status = res.statusCode;
    
    log.info('status code:', status);
    
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
  
  return <RequestHandler>function (req, res, next) {
    
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
          statikCache.emit(eventName, 'sending a 204/304 for path:', req.path);
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
    
    if (cache[absFilePath]) {
      
      if (debug) {
        isSelfLog ? log.info('using cache for file:', absFilePath) :
          statikCache.emit(eventName, 'using cache for file:', absFilePath);
      }
      
      // res.header('Cache-Control','private');
      // res.setHeader("Cache-Control", "private, max-age=2592000");
      // res.setHeader("Expires", new Date(Date.now() + 2592000000).toUTCString());
      
      res.removeHeader('Cache-Control');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      
      res.end('\n' + cache[absFilePath] + '\n');
      // res.send();
      return;
    }
    
    if (debug) {
      isSelfLog ?
        log.warn('*not* using cache for file:', absFilePath) :
        statikCache.emit(eventName, '*not* using cache for file:', absFilePath);
    }
    
    next();
    
  }
  
});

export default statikCache;

export const r2gSmokeTest = function () {
  return true;
};

import EventEmitter = require('events');
import statikCache, {StatikCacheOpts} from "./index";
import {RequestHandler} from "express";

export interface FunctionEmitter extends Function, EventEmitter {

}

export const makeFunctionEmitter = function (fn: Function): FunctionEmitter {
  const p = Object.assign(Object.create(Function.prototype), EventEmitter.prototype);
  Object.setPrototypeOf(fn, p);
  EventEmitter.call(fn);
  return fn as FunctionEmitter;
};


const keep: Array<RegExp> = [
  /^README/i,
  /^package\.json$/,
  /^LICENSE/i,
  /^LICENCE/i,
  /^CHANGELOG/i
];

/*

https://docs.npmjs.com/misc/developers

 note: If, given the structure of your project, you find .npmignore to be a maintenance headache,
 you might instead try populating the files property of package.json, which is an array of file or
 directory names that should be included in your package. Sometimes a whitelist is easier to manage
 than a blacklist.

*/

const alwaysIgnore = [
  '.*.swp',
  'node_modules',
  '.idea',
  '.vscode',
  '._*',
  '.DS_Store',
  '.git',
  '.hg',
  '.npmrc',
  '.lock-wscript',
  '.svn',
  '.wafpickle-*',
  'config.gypi',
  'CVS',
  'npm-debug.log'
];

export const npmIgnoreToArray = function (npmignore: string): Array<string> {
  return String(npmignore).trim().split('\n').concat(alwaysIgnore).map(v => String(v).trim())
    .filter(Boolean)
    .filter(v => !v.startsWith('#'))
    .filter((v, i, a) => a.indexOf(v) === i)  // get unique list
    .filter(function (v) {
      return !keep.some(function (rgx) {
        return rgx.test(v);
      });
    });
};

export const npmIgnoreToTARExclude = function (npmignore: Array<string>): string {
  return npmignore.map(function (v) {
      return `--exclude='${v}'`;
    })
    .join(' ')
};


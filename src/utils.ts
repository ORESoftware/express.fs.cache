import EventEmitter = NodeJS.EventEmitter;
import statikCache, {StatikCacheOpts} from "./index";
import {RequestHandler} from "express";

export interface FunctionEmitter extends Function, EventEmitter {

}

export const makeFunctionEmitter = function (fn: Function): FunctionEmitter {
  const p = Object.assign(Object.create(Function.prototype), EventEmitter.prototype);
  Object.setPrototypeOf(fn, p);
  return fn as FunctionEmitter;
};

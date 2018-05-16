#!/usr/bin/env node
'use strict';

import http = require('http');
import cp = require('child_process');
import * as path from "path";
import net = require('net');
import * as https from "https";
import * as utils from './utils';
import fs = require('fs');
import * as util from "util";

// https://registry.npmjs.org/

// npm config set registry https://registry.npmjs.org/
// npm config set registry localhost:3441
// npm config set proxy http://localhost:3441
// npm config set https-proxy http://localhost:3441

// !!!!!
// npm config set strict-ssl false

const urls = <{[key:string]: string}>{
  '/@oresoftware/waldo': '/host_user_home/WebstormProjects/oresoftware/waldo',
  '/gmx': '/host_user_home/WebstormProjects/oresoftware/gmx',
  '/r2g': '/host_user_home/WebstormProjects/oresoftware/r2g'
};

const s = http.createServer(function (clientRequest, clientResponse) {
  
  // console.log('server got a request');
  
  const decoded = String(decodeURI(clientRequest.url || ''));
  
  // console.log('decoded url:', decoded);
  
  const h = clientRequest.headers;
  
  const matchesJSON = String(h.accept || '').match('json');
  const pacoteReqType = String(h['pacote-req-type'] || '') === 'packument';
  
  if (urls[decoded]  && (decoded.endsWith('.tgz') || decoded.endsWith('.tar'))) {
    
    console.log('req.method', clientRequest.method);
    console.log('req.url', clientRequest.url);
    console.log('req.headers', clientRequest.headers);
    
    console.log('we doing this project thang...');
    
    const project = urls[decoded];
    
    fs.readFile(path.resolve(project + '/.npmignore'), function(err, data){
      
      if(err){
        clientResponse.statusCode = 500;
        clientResponse.write(util.inspect(err));
        return;
      }
      
      console.log('writing response as tar file! for package', project);
      
      const exclusions = utils.npmIgnoreToTARExclude(utils.npmIgnoreToArray(String(data || '')));
      const k = cp.spawn('bash');
      k.stdin.end(`tar -cz ${exclusions} ${project} `);
      k.stdout.pipe(clientResponse);
      
    });
    
    
    return;
  }
  
  const proxy = http.request({
      hostname: 'registry.npmjs.org',
      port: 80,
      path: clientRequest.url,
      method: clientRequest.method
    },
    function (res) {
      res.pipe(clientResponse);
    });
  
  // clientRequest.on('data', function(d){
  //   console.log('client request data:', String(d));
  // });
  
  
  Object.keys(h).forEach(function(k){
    proxy.write(`${k}\t${h[k]}\r\n`);
  });
  
  proxy.write('\n');
  clientRequest.pipe(proxy);
  
});

s.listen(3441);






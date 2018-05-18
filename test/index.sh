#!/usr/bin/env bash

npm cache clear -f;
npm cache clean -f;

#rm -rf "$HOME/.npm";
#mkdir -p "$HOME/.npm";
#
#npm config set proxy "http://npm_registry_server:3441"
#npm config set https-proxy "https://npm_registry_server:3441"
#
#npm set registry "http://npm_registry_server:3441"
#npm config set registry "http://npm_registry_server:3441"

#npm install --loglevel=warn

#sudo chown -R $(whoami) "node_modules"

echo "now installing the deps...!!"
npm install /host_user_home/WebstormProjects/oresoftware/gmx

gmx echo "all done here foo.";

r2g

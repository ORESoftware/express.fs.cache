#!/usr/bin/env bash

tar --exclude='./node_modules' \
    --exclude='./.git' \
    --exclude='./.idea' \
    -cvf - . | gzip > archive.tar.gz

#tar -zcf foo.tgz -s /^"$(pwd)"/"$(pwd)/package"/ "$(pwd)"

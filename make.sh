#!/bin/sh

mkdir -p build
npm i && node_modules/.bin/rollup -c

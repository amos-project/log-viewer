#!/usr/bin/env bash
# @since 2024-09-28 01:49:59
# @author junbao <junbao@moego.pet>

set -xeuo pipefail

rm -rf build

pnpm build

rm -rf "$HOME/Downloads/chrome-json-view"*

version="$(jq -r '.version' package.json)"
cd build
zip -r "$HOME/Downloads/chrome-json-view-$version.zip" -r .

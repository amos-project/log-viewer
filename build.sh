#!/usr/bin/env bash
# @since 2024-09-28 01:49:59
# @author junbao <junbao@moego.pet>

set -xeuo pipefail

version="$(jq -r '.version' package.json)"
rm -rf build
pnpm build
cd build
file="chrome-json-view-$version.zip"
zip -r "$file" -r .
rm -rf "$HOME/Downloads/chrome-json-view"*
mv "$file" "$HOME/Downloads/$file"
cd ..
mv build "$HOME/Downloads/chrome-json-view"

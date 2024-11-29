#!/usr/bin/env bash
# @since 2024-09-28 01:49:59
# @author junbao <junbao@moego.pet>

set -euo pipefail

level="$1"

if [[ "$(git status -s)" != "" ]]; then
  echo "ERROR: no diff allowed"
  exit 1
fi

version="$(yq -r '.version' package.json)"
product="$(yq -r '.product' package.json)"
desc="$(yq -r '.description' package.json)"

version="$(npx semver -i "$level" "$version")"

yq -i ".version = \"$version\"" package.json
yq -i ".version = \"$version\"" src/manifest.json
yq -i ".description = \"$desc\"" src/manifest.json
yq -i ".name = \"$product\"" src/manifest.json

git add -A
git commit -m "v$version"
git fetch -aptPf
git tag "v$version"

rm -rf build
yarn build
rm -rf "$HOME/Downloads/log-viewer-"*
cd build
zip -r "$HOME/Downloads/log-viewer-$version.zip" -r .

#!/usr/bin/env bash
set -euo pipefail

VERSION_TS="$(date -u +%Y.%m.%d.%H%M%S)"
BUILD_TIME="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

FILE="version.json"
if [[ ! -f "$FILE" ]]; then
  echo "{\n  \"version\": \"$VERSION_TS\",\n  \"buildTime\": \"$BUILD_TIME\"\n}" > "$FILE"
else
  # Update version and buildTime in place without jq
  tmpfile=$(mktemp)
  sed -E "s/\"version\"\s*:\s*\"[^\"]*\"/\"version\": \"$VERSION_TS\"/" "$FILE" | \
  sed -E "s/\"buildTime\"\s*:\s*\"[^\"]*\"/\"buildTime\": \"$BUILD_TIME\"/" > "$tmpfile"
  mv "$tmpfile" "$FILE"
fi

echo "Bumped version to $VERSION_TS ($BUILD_TIME) in $FILE"
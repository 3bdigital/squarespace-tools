#!/bin/sh
# Regenerates the minified builds and runs the tests.
# Run after editing any tool's source.
set -e
cd "$(dirname "$0")"

for tool in dates counter; do
  src="$tool/sqs-$tool.js"
  min="$tool/sqs-$tool.min.js"
  npx --yes terser@5 "$src" \
    --compress --mangle \
    --comments '/^!/' \
    --output "$min"
  node --check "$min"
  echo "$min  $(wc -c < "$min" | tr -d ' ') bytes"
done

node --test 'test/*.test.mjs'

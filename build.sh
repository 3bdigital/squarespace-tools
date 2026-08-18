#!/bin/sh
# Regenerates the minified build. Run after editing dates/sqs-dates.js.
set -e
cd "$(dirname "$0")"
npx --yes terser@5 dates/sqs-dates.js \
  --compress --mangle \
  --comments '/^!/' \
  --output dates/sqs-dates.min.js
echo "dates/sqs-dates.min.js  $(wc -c < dates/sqs-dates.min.js | tr -d ' ') bytes"
node --check dates/sqs-dates.min.js && echo "syntax OK"

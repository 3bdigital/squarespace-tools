# Development

Internal notes. The tool READMEs are for the people installing them.

## Layout

```text
dates/sqs-dates.js         source, edit this
dates/sqs-dates.min.js     generated, do not edit
counter/sqs-counter.js     source, edit this
counter/sqs-counter.min.js generated, do not edit
counter/demo.html          every counter mode on one page
counter/test-flash.html    did the markers beat the paint?
test/*.test.mjs            node --test, no dependencies
build.sh                   minify both tools, then run the tests
```

Each tool is one file with no build step for the person using it and no runtime
dependencies. Keep it that way: a dependency here is a dependency on every
client site.

Neither source may contain a literal closing script tag, even inside a comment,
because people paste these straight into Code Injection.

## Build and test

```sh
./build.sh
```

Terser over each tool, a syntax check on the output, then the tests. Run it
after editing any source, and commit the regenerated `.min.js` with the change.

```sh
node --test 'test/*.test.mjs'
```

The tests load a tool into a `vm` sandbox with just enough DOM stubbed to get
past the editor guard, then exercise the parts that are pure functions:
`sqsCounter.parse`, `.marker`, `.plan`, `.sample`, and the dates parser and
formatter. `test/load.mjs` also exposes `__fire('DOMContentLoaded')`, `__head`
and `__timers` so lifecycle behaviour can be driven without a browser.

The dates tests exist to catch a change to the repo altering the tool people
are already using. If they fail, that is the point.

## Looking at it

```sh
python3 -m http.server 8177
```

<http://localhost:8177/counter/demo.html>, with:

| Switch | What it shows |
| --- | --- |
| `?min=1` | the built file rather than the source |
| `?hide=1` | `data-counter-hide` |
| `?reduced=1` | the reduced-motion path |
| `?nio=1` | the fallback where there is no `IntersectionObserver` |

The demo loads the script blocking, in the head, the way the README tells
people to install it. Do not "improve" that into an appended script element:
those are async, so the page paints every `{{101}}` before the script is
fetched, and the demo then lies about the tool.

<http://localhost:8177/counter/test-flash.html> reports whether the markers
were replaced before the page finished parsing, and whether any braces survived
it. `?footer=1` loads the script the way footer injection would, for the
comparison.

Animation timing needs a real foreground tab. A backgrounded one gets no
animation frames and clamps timers to a second, and the counter deliberately
pauses rather than skipping ahead when frames stop, so it crawls there.

## Releasing

See [releasing.md](releasing.md).

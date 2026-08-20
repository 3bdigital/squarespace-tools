# Changelog

Pin a tag in production, so a site's version changes only when you change it.

A tag is a snapshot of the whole repository, because jsDelivr serves files from
GitHub tags and there is no npm package to version per tool. Each entry below
therefore names the tool it affects; anything not named is byte-identical to
the tag before it.

## v1.5.0

**counter**, new. Numbers that count up when they scroll into view.

- Type `{{101}}` into an ordinary Squarespace text block, styled with
  Squarespace's own text controls, and the script replaces only the number.
  `{{1,000+}}`, `{{12.5}}`, `{{$6bn+}}` and `{{100>0}}` all do what they look
  like: the number you write is the number it finishes on, separators,
  decimals, prefix, suffix and all.
- Per-counter options go after a pipe, using the attribute names without the
  prefix: `{{1,000,000,000 | 4s step=10000000}}`, `{{12.5 | suffix="%"}}`. A
  bare time is the duration. A marker inside `code`, `pre`, `kbd` or `samp` is
  left as typed.
- `<span class="sqs-counter">1,000</span>` in a code block for the same
  settings as attributes, with the element's own text as both the target and
  the no-JavaScript fallback. A marker builds exactly this element, so the two
  forms are one code path.
- Every counter takes the same time by default, 2 seconds, so a row of stats
  finishes together. `data-counter-speed` counts at a fixed rate instead, where
  a bigger number takes longer.
- `data-counter-step` controls what the number counts in, so a billion climbs
  in ten-millions rather than scrambling nine digits. It never overshoots and
  always lands on the exact target, even when the step does not divide evenly.
- Waits for the counter to scroll into view, respects
  `prefers-reduced-motion`, pauses in a backgrounded tab, holds the finished
  width so nothing shuffles sideways, and gives screen readers the final value
  once rather than a running commentary.
- Markers are converted as the page parses, watching for text appended to a
  node as well as for whole nodes, because the parser usually grows a text node
  a chunk at a time and a marker split across two chunks would otherwise be
  seen once, incomplete, and not looked at again until the page had been drawn.
- `data-counter-hide` hides the text until the markers are gone, either
  everywhere or in one selector you name, for when beating the paint is not
  good enough. The text is revealed when the page is parsed, or after four
  seconds whatever happens, so a broken script cannot leave a blank page.
- Does nothing inside the Squarespace editor or preview, for the same reason
  dates does not: a save there would write the counter's own output into the
  page and lose the `{{101}}` that produced it.

**repo**

- `build.sh` now minifies every tool and runs the tests.
- `test/` holds the first automated tests, run with `node --test`, no
  dependencies and no browser. They cover the counter's arithmetic and pin the
  existing dates behaviour.
- `dates/sqs-dates.min.js` is unchanged, byte for byte, from v1.4.0.

## v1.4.0

**dates**

- Logs a console message when it skips a page for being inside the editor or
  preview frame, so unformatted dates there are not mistaken for a failure.

## v1.3.0

**dates**

- Attributes are now prefixed `data-date-`: `data-date-format`,
  `data-date-format-events`, `data-date-locale`, `data-date-timezone`,
  `data-date-include`, `data-date-exclude`, `data-date-debug`. The old
  unprefixed names still work, so pinned sites can move up without edits.

## v1.2.0

**dates**

- Event dates are now formatted: event lists, event item pages, and summary
  blocks of events. They carry a real ISO `datetime`, so they need no parsing.
- Event times, day/month tiles and calendar blocks stay untouched, and are now
  excluded by exact class name.
- Fixed: `[class*="event-time"]` matched the summary block settings class
  `summary-block-setting-secondary-metadata-event-time` and silently excluded
  entire summary blocks.
- Added `data-event-format`, which falls back to `data-format`.

## v1.1.0

**dates**

- Does nothing when framed by the Squarespace editor. The editor reads the live
  DOM when it saves, so rewriting content there risks writing changes and
  marker attributes into the saved page.

## v1.0.0

**dates**

- First release. Blog list, blog post and summary block dates, resolved from
  the ISO `datetime` attribute, then the visible text parsed against the site
  locale, then the `datePublished` schema markup on item pages.
- Leaves an element alone rather than writing `Invalid Date`.
- Repairs the `datetime` attribute to real ISO.

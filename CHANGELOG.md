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
- `<span class="sqs-counter">1,000</span>` in a code block, for styling beyond
  what Squarespace's text controls offer. The element's own text is both the
  target and the no-JavaScript fallback, so this form cannot flash. A marker
  builds exactly this element, so the two are one code path.
- Code blocks are searched for markers as well as text and markdown blocks, so
  either form works in one.
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
- Stops dead if the editor starts up in a page it is already running in, which
  Squarespace can do without loading a fresh document. Every counter goes back
  to the markup it came from, marker text and all, every observer is dropped
  and every animation cancelled. A guard that only runs at load cannot cover
  that, and a script still rewriting the DOM while the editor renders is how a
  section ends up drawn twice.

**dates**

- Stops dead if the editor starts up in a page it is already running in, and
  puts every date back to what Squarespace rendered: the text it replaced, the
  `datetime` attribute exactly as it found it including removing one it added,
  and the `data-sqs-dates` marker off every element. The v1.1.0 guard only ran
  at load, so it could not see the editor arriving afterwards, and a script
  still rewriting the DOM while the editor renders is how a section ends up
  drawn twice.
- No change to what it formats, how it parses, or any attribute. A site moving
  from v1.4.0 sees the same dates.

**repo**

- `build.sh` now minifies every tool and runs the tests.
- `test/` holds the first automated tests, run with `node --test`, no
  dependencies and no browser: the counter's arithmetic, the editor guard on
  both tools, and the existing dates parsing and formatting pinned so a change
  here cannot quietly alter the tool people already use.
- `docs/squarespace-editor.md` is the rule both tools now follow, and the one
  any new tool has to.

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

# Changelog

Pin a tag in production, so a site's version changes only when you change it.

## v1.4.0

- Logs a console message when it skips a page for being inside the editor or
  preview frame, so unformatted dates there are not mistaken for a failure.

## v1.3.0

- Attributes are now prefixed `data-date-`: `data-date-format`,
  `data-date-format-events`, `data-date-locale`, `data-date-timezone`,
  `data-date-include`, `data-date-exclude`, `data-date-debug`. The old
  unprefixed names still work, so pinned sites can move up without edits.

## v1.2.0

- Event dates are now formatted: event lists, event item pages, and summary
  blocks of events. They carry a real ISO `datetime`, so they need no parsing.
- Event times, day/month tiles and calendar blocks stay untouched, and are now
  excluded by exact class name.
- Fixed: `[class*="event-time"]` matched the summary block settings class
  `summary-block-setting-secondary-metadata-event-time` and silently excluded
  entire summary blocks.
- Added `data-event-format`, which falls back to `data-format`.

## v1.1.0

- Does nothing when framed by the Squarespace editor. The editor reads the live
  DOM when it saves, so rewriting content there risks writing changes and
  marker attributes into the saved page.

## v1.0.0

- First release. Blog list, blog post and summary block dates, resolved from
  the ISO `datetime` attribute, then the visible text parsed against the site
  locale, then the `datePublished` schema markup on item pages.
- Leaves an element alone rather than writing `Invalid Date`.
- Repairs the `datetime` attribute to real ISO.

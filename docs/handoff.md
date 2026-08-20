# Handoff

Latest session at the top. Done, next, gotchas.

## 2026-08-20, the counter tool

**Done.** `counter/sqs-counter.js` and its minified build, `counter/README.md`,
`counter/demo.html`, `counter/test-flash.html`, 53 tests in `test/`, and the
docs: root README, changelog under v1.5.0, `docs/architecture.md`,
`docs/releasing.md`, `docs/development.md`.

Branch `claude/squarespace-counter-tool-480b7b` is **pushed**. Not merged, not
tagged, main untouched. Live install URL while it stays that way:

```text
https://cdn.jsdelivr.net/gh/3bdigital/squarespace-tools@7f11c496946df895b080ca77c46fbe2f2f75a70d/counter/sqs-counter.min.js
```

A marker takes options after a pipe, `{{1,000 | 4s step=50}}`, using the
attribute names without the prefix. It builds the same `.sqs-counter` element a
code block would, so there is one code path.

**Next.**

1. Try it on a real Squarespace site from the commit URL above, in the Header.
2. When happy: merge to main, tag `v1.5.0`, and the `@v1.5.0` URLs already in
   the docs come true. Turn the two red boxes in `docs/architecture.md` green
   at the same time.

**Gotchas.**

- Tool READMEs are for the people installing them. Build, test and demo notes
  live in `docs/development.md`.

- The demo page used to append its script from the end of the body, which is
  async: the page was parsed and painted, braces and all, before the script was
  fetched. It loads it blocking in the head now, the way the README says to. Any
  flash on a page that loads it that way is a loading problem, not a tool one.
- The editor guard runs at load and again whenever an `sqs-edit-mode` class
  appears, because Squarespace can start the editor in a document that is
  already running. Both paths are covered by `test/editor-guard.test.mjs`, for
  dates as well as the counter. `sqs-dates` has the load-time guard only: it
  cannot undo itself, having kept no record of the text it replaced.
- A raw `{{101}}` on screen is, in order of likelihood: the editor or preview
  (permanent, by design), footer injection or `defer` (move it to the header),
  or the paint winning the race. `data-counter-hide` is the certain cure and is
  off by default. The load-time behaviour could not be measured in this
  session's browser pane, which never paints and clamps timers, so the hide
  mechanism is covered by sandbox tests instead.

- The install URLs in the READMEs say `@v1.5.0`, which 404s until the tag
  exists. Use the full-SHA commit URL until then: a short SHA serves the right
  file but is cached like a branch, seven days in the browser.
- `dates/sqs-dates.min.js` rebuilds byte-identical, so `git status` staying
  clean on it is the check that dates is untouched.
- The counter goes in the Code Injection **header**, not the footer, so a typed
  `{{101}}` is replaced before the page paints.
- `python3 -m http.server 8177` may still be running from this session.

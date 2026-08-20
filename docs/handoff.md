# Handoff

Latest session at the top. Done, next, gotchas.

## 2026-08-20, the counter tool

**Done.** `counter/sqs-counter.js` and its minified build, `counter/README.md`,
`counter/demo.html`, `counter/test-flash.html`, 53 tests in `test/`, and the docs: root README, changelog
under v1.5.0, `docs/architecture.md`, `docs/releasing.md`. On
`claude/squarespace-counter-tool-480b7b`. Nothing pushed and nothing tagged.

A marker takes options after a pipe, `{{1,000 | 4s step=50}}`, using the
attribute names without the prefix. It builds the same `.sqs-counter` element a
code block would, so there is one code path.

**Next.**

1. Look at the demo in a normal foreground tab. The animation itself is the one
   thing that could not be checked in this session: the tooling's browser pane
   stays backgrounded, and the counter deliberately pauses when frames stop, so
   it crawls there. Values, formatting, mounting, markers, reduced motion,
   late-added content and the minified build were all verified.
2. Push the branch and try it on a real Squarespace site from a commit URL. See
   `docs/releasing.md`.
3. Merge, bump the version in the three install URLs, tag `v1.5.0`.

**Gotchas.**

- The demo page used to append its script from the end of the body, which is
  async: the page was parsed and painted, braces and all, before the script was
  fetched. It loads it blocking in the head now, the way the README says to. Any
  flash on a page that loads it that way is a loading problem, not a tool one.
- A raw `{{101}}` on screen is, in order of likelihood: the editor or preview
  (permanent, by design), footer injection or `defer` (move it to the header),
  or the paint winning the race. `data-counter-hide` is the certain cure and is
  off by default. The load-time behaviour could not be measured in this
  session's browser pane, which never paints and clamps timers, so the hide
  mechanism is covered by sandbox tests instead.

- The install URLs in the READMEs already say `@v1.5.0`, which 404s until the
  tag exists.
- `dates/sqs-dates.min.js` rebuilds byte-identical, so `git status` staying
  clean on it is the check that dates is untouched.
- The counter goes in the Code Injection **header**, not the footer, so a typed
  `{{101}}` is replaced before the page paints.
- `python3 -m http.server 8177` may still be running from this session.

# Handoff

Latest session at the top. Done, next, gotchas.

## 2026-08-20, the counter tool

**Done.** `counter/sqs-counter.js` and its minified build, `counter/README.md`,
`counter/demo.html`, 39 tests in `test/`, and the docs: root README, changelog
under v1.5.0, `docs/architecture.md`, `docs/releasing.md`. Three commits on
`claude/squarespace-counter-tool-480b7b`. Nothing pushed and nothing tagged.

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

- The install URLs in the READMEs already say `@v1.5.0`, which 404s until the
  tag exists.
- `dates/sqs-dates.min.js` rebuilds byte-identical, so `git status` staying
  clean on it is the check that dates is untouched.
- The counter goes in the Code Injection **header**, not the footer, so a typed
  `{{101}}` is replaced before the page paints.
- `python3 -m http.server 8177` may still be running from this session.

# Releasing, and testing before you release

Nothing here is published to npm. jsDelivr reads this repository from GitHub
directly, so "releasing" is a git tag and nothing else.

## What a tag actually does

```text
cdn.jsdelivr.net/gh/3bdigital/squarespace-tools@v1.4.0/dates/sqs-dates.min.js
```

That URL is the repository as it stood at `v1.4.0`, and jsDelivr serves it with
`immutable` caching for a year. It cannot change. Adding a tool, or cutting
`v1.5.0`, does not reach a site pinned to `v1.4.0`.

A tag covers the whole repository, so the changelog names the tool each entry
affects. A tool with no entry under a version is byte-identical to the version
before it.

## Testing on a real site without tagging

Push the branch. Nothing on GitHub except a tag is wired to a live site, so a
branch push cannot change one.

Then link a **commit** URL, not a branch URL:

```html
<script src="https://cdn.jsdelivr.net/gh/3bdigital/squarespace-tools@d7525c7/counter/sqs-counter.min.js"></script>
```

Short or full SHA both work. A commit URL is immutable, like a tag, so what you
test is exactly what you looked at, and each new push gives you a new URL to
paste. That is the sandbox: a real Squarespace site, the real CDN, no tag.

Branch URLs (`@main`, `@claude/my-branch`) also work, but jsDelivr sends them
with `max-age=604800`, so a browser that has fetched one keeps it for a week
whatever you push. Use them for a quick look, never to iterate.

Locally, before any of that:

```sh
./build.sh                  # minify both tools, run the tests
python3 -m http.server 8177 # then open counter/demo.html
```

## Cutting a release

1. `./build.sh`, and check the tests pass and the `.min.js` files are current.
2. Update `CHANGELOG.md` under a new version heading, naming the tools affected.
3. Bump the version in the install URLs in `README.md` and each tool's
   `README.md`.
4. Update `docs/architecture.md` if the shape of anything changed.
5. Commit, merge to `main`, then:

```sh
git tag v1.5.0 && git push origin v1.5.0
```

6. Check the tag serves before telling anyone:

```sh
curl -sI https://cdn.jsdelivr.net/gh/3bdigital/squarespace-tools@v1.5.0/counter/sqs-counter.min.js | head -1
```

jsDelivr picks up a new tag within a minute or two.

## Moving a site up a version

Edit the version in the Code Injection tag. That is the whole upgrade, and it
is per site, so one client moving up cannot affect another. Read the changelog
entries between the two versions first: for the tools here, an attribute has
never been removed, but a default has changed.

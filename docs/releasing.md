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
<script src="https://cdn.jsdelivr.net/gh/3bdigital/squarespace-tools@7c220a2d65880f8dd91866dd91fce17ed2fca8bc/counter/sqs-counter.min.js"></script>
```

Use the **full 40-character SHA**. `git rev-parse HEAD` prints it. That is the
form jsDelivr treats as immutable, so what you test is exactly what you looked
at, and each new push gives you a new URL to paste. That is the sandbox: a real
Squarespace site, the real CDN, no tag.

A short SHA resolves and serves the right file, but jsDelivr caches it the way
it caches a branch, so it is the wrong thing to hand to a client site. Measured
on this repo:

| Ref | `cache-control` |
| --- | --- |
| `@v1.4.0` | `max-age=31536000, immutable` |
| `@7c220a2d65880f8dd91866dd91fce17ed2fca8bc` | `max-age=31536000, immutable` |
| `@7c220a2` | `max-age=604800, s-maxage=43200` |
| `@main` | `max-age=604800, s-maxage=43200` |

So a branch or short-SHA URL sits in a browser for a week whatever you push
after it. Fine for one look, wrong for iterating and wrong for a client.

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

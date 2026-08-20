# squarespace-tools

Small, dependency-free scripts for Squarespace 7.1 sites. Each one is a single
file you link from Code Injection. No build step, no libraries, no accounts.

| Tool | What it does |
| --- | --- |
| [dates](dates/) | Rewrites every blog, summary and event date on the site into one consistent format |
| [counter](counter/) | Counts numbers up when they scroll into view, styled in Squarespace like any other text |

## dates, in one line

Settings > Advanced > Code Injection > Footer:

```html
<script src="https://cdn.jsdelivr.net/gh/3bdigital/squarespace-tools@v1.4.0/dates/sqs-dates.min.js" data-date-format="D MMMM YYYY"></script>
```

That gives you `1 December 2025` everywhere Squarespace shows an article date.
Change `data-date-format` and nothing else.

That format is also the default, so leaving the attribute off does not mean
"leave the dates alone". Loading the script always rewrites them. Full
documentation in [dates/README.md](dates/README.md).

Dates stay unformatted in the Squarespace editor and in preview mode, by
design. Check the live site in an ordinary tab. See
[dates/README.md](dates/README.md#check-the-live-site-not-the-editor-or-the-preview).

## counter, in one line

Settings > Advanced > Code Injection > Header:

```html
<script src="https://cdn.jsdelivr.net/gh/3bdigital/squarespace-tools@v1.5.0/counter/sqs-counter.min.js"></script>
```

Then type `{{101}}` into an ordinary text block and style that block however you
like. The number counts up to 101 when it scrolls into view, and keeps every
bit of styling you gave it.

What you write is what you get: `{{1,000+}}` keeps its comma and its plus,
`{{12.5}}` keeps its one decimal, `{{$6bn+}}` counts the 6. Full documentation
in [counter/README.md](counter/README.md).

Counters, like dates, do not run in the Squarespace editor or preview, by
design. Check the live site in an ordinary tab.

## Versions

Pin a tag. See [CHANGELOG.md](CHANGELOG.md).

There is no npm package here: jsDelivr serves the files straight from a GitHub
tag, so a tag is a snapshot of the whole repo rather than of one tool. A site
pinned to `@v1.4.0` is fixed at that snapshot forever, whatever later tags add.

## Development

```sh
./build.sh    # minifies every tool, then runs the tests
```

[docs/releasing.md](docs/releasing.md) covers cutting a tag, and how to test a
change on a real site without cutting one.
[docs/architecture.md](docs/architecture.md) is the diagram.

## Licence

MIT. See [LICENSE](LICENSE).

# squarespace-tools

Small, dependency-free scripts for Squarespace 7.1 sites. Each one is a single
file you link from Code Injection. No build step, no libraries, no accounts.

| Tool | What it does |
| --- | --- |
| [dates](dates/) | Rewrites every blog, summary and event date on the site into one consistent format |

## dates, in one line

Settings > Advanced > Code Injection > Footer:

```html
<script src="https://cdn.jsdelivr.net/gh/3bdigital/squarespace-tools@v1.3.0/dates/sqs-dates.min.js" data-date-format="D MMMM YYYY"></script>
```

That gives you `1 December 2025` everywhere Squarespace shows an article date.
Change `data-date-format` and nothing else.

That format is also the default, so leaving the attribute off does not mean
"leave the dates alone". Loading the script always rewrites them. Full
documentation in [dates/README.md](dates/README.md).

## Versions

Pin a tag. See [CHANGELOG.md](CHANGELOG.md).

## Licence

MIT. See [LICENSE](LICENSE).

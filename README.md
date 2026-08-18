# squarespace-tools

Small, dependency-free scripts for Squarespace 7.1 sites. Each one is a single
file you link from Code Injection. No build step, no libraries, no accounts.

| Tool | What it does |
| --- | --- |
| [dates](dates/) | Rewrites every article date on the site into one consistent format |

## dates, in one line

Settings > Advanced > Code Injection > Footer:

```html
<script src="https://cdn.jsdelivr.net/gh/3bdigital/squarespace-tools@v1.0.0/dates/sqs-dates.min.js" data-format="D MMMM YYYY"></script>
```

That gives you `1 December 2025` everywhere Squarespace shows an article date.
Change `data-format` and nothing else. Full documentation in
[dates/README.md](dates/README.md).

## Licence

MIT. See [LICENSE](LICENSE).

# sqs-dates

One consistent date format across a Squarespace 7.1 site. No dependencies.

## Install

Settings > Advanced > Code Injection > Footer:

```html
<script src="https://cdn.jsdelivr.net/gh/3bdigital/squarespace-tools@v1.4.0/dates/sqs-dates.min.js" data-date-format="D MMMM YYYY"></script>
```

That is the whole setup. It finds every article date on every page, works out
what Squarespace actually rendered, and rewrites it. Language and timezone are
read from the site's own settings, so a French site gets `1 décembre 2025` from
the same `data-date-format`.

Drop the `@v1.4.0` for the latest release, or pin it as above so a future
change cannot alter a live site without you deciding to.

## Format tokens

Day.js / Moment style, which is what most people already have in their heads.

| Token | Output |
| --- | --- |
| `YYYY` `YY` | 2025, 25 |
| `MMMM` `MMM` `MM` `M` | December, Dec, 12, 12 |
| `DD` `D` `Do` | 01, 1, 1st |
| `dddd` `ddd` | Monday, Mon |
| `HH` `H` `hh` `h` | 09, 9, 09, 9 |
| `mm` `m` `ss` `s` | 05, 5, 03, 3 |
| `A` `a` | PM, pm |
| `[text]` | literal, not parsed |

`1 December 2025` is `D MMMM YYYY`, which is also what you get if you leave
`data-date-format` off entirely.

There is no "leave the dates alone" mode. Loading the script always rewrites
every article date it can read, so add the tag to a site whose dates you
actually want changed, not to every site as a precaution.

## Why this is needed

Squarespace 7.1 renders article dates three different ways, and none of them is
reliably machine-readable:

| Where | Markup | Problem |
| --- | --- | --- |
| Blog list and grid | `<time class="blog-date" pubdate>18/06/2024</time>` | No `datetime` attribute at all. The text is in the site's locale format. |
| Blog post page | `<time class="dt-published blog-meta-item--date" datetime="10 Apr">` | The `datetime` attribute holds a display string, not a date. No year. |
| Summary blocks | `<div class="summary-metadata-item--date">` | Not a `<time>` element. |

The obvious fix, `new Date(el.innerText)`, is `Invalid Date` on any site that
renders day-first, and on a post page `new Date("10 Apr")` silently returns the
year 2001.

So for each element this script tries, in order:

1. The `datetime` attribute, but only if it is a real ISO date.
2. The visible text, parsed against the site's own locale to decide whether
   `06/07` is 6 July or 7 June. A value over 12 settles it either way, and a
   reading the locale makes impossible gets swapped rather than dropped.
3. The schema markup Squarespace emits on item pages,
   `<meta itemprop="datePublished" content="2024-04-10T16:13:10+0100">`. That
   meta describes the page's own item, so it is read from the element's
   enclosing `<article>` first, and page-wide only where Squarespace confirms
   an item page. Otherwise one date would get stamped onto every entry in a
   list.

If none of those yield a date, the element is left exactly as it was. It never
writes `Invalid Date` or `NaN`.

It also repairs the `datetime` attribute to a real ISO date, so the markup
becomes valid for anything else reading it, and it writes into the innermost
wrapper so theme styling and links survive.

## Check the live site, not the editor or the preview

**Dates stay unformatted in the Squarespace editor and in preview mode. This is
deliberate, and it is not a sign the script has failed.**

Squarespace loads your site inside a frame for both, and the editor reads the
live DOM when it saves, so a script that rewrites content there risks having
its changes written into your saved page. This one detects the frame and does
nothing at all: no rewriting, no marker attributes, not even its debugging
global.

Preview is the one that catches people out. It hides the admin chrome and
rewrites the address bar to the real page URL, so it looks like the live site
while still being framed.

| Where you are looking | Dates formatted? |
| --- | --- |
| Editor | no |
| Preview, the arrow button | no |
| Live site in a normal tab | yes |
| Live site while logged in | yes |

To check your format, open the site in an ordinary browser tab. If you are
unsure which you are looking at, open the console: when the script skips a page
it says so and why.

## Coverage

| Surface | Handled |
| --- | --- |
| Blog list, grid and post pages | yes |
| Summary blocks, posts and events | yes |
| Event list and event item pages | yes |
| Event times (`17:00 - 18:00`) | left alone |
| Event day/month tiles | left alone |
| Calendar blocks | left alone |

Event dates are the most reliable dates on a 7.1 site: unlike blog dates they
carry a real ISO `datetime` attribute, so they need no parsing at all.

Three things are deliberately untouched. Event **times** carry a start and an
end and are already offered in 12 and 24 hour form by Squarespace. The **day
and month tiles** on event lists and summary thumbnails split the date across
two elements sized for a big number, and a full date would wreck the layout.
**Calendar blocks** are a grid of bare day numbers, where rewriting anything
would be nonsense.

Events can take their own format if you want the weekday on an event but not
on a blog post:

```html
<script src="https://cdn.jsdelivr.net/gh/3bdigital/squarespace-tools@v1.4.0/dates/sqs-dates.min.js"
        data-date-format="D MMMM YYYY"
        data-date-format-events="dddd D MMMM YYYY"></script>
```

`data-date-format-events` falls back to `data-date-format` when it is not
set, so consistency is the default.

Late-loading content is covered: the script runs immediately, again on
`DOMContentLoaded` and `load`, and watches for added nodes, so blog "load more",
lazy sections and ajax page changes are all picked up.

## If you need more than data-date-format

Every attribute below is optional. All are prefixed `data-date-` so they
cannot be confused with another script's attributes on the same tag.

| Attribute | Default |
| --- | --- |
| `data-date-format` | `D MMMM YYYY` |
| `data-date-format-events` | whatever `data-date-format` is |
| `data-date-locale` | the site language |
| `data-date-timezone` | the site timezone |
| `data-date-include` | the selectors listed in the source |
| `data-date-exclude` | event times, date tiles, calendar blocks, `[data-sqs-dates-skip]` |
| `data-date-debug` | `false`, set `"true"` to log anything it could not read |

Add `data-sqs-dates-skip` to any element to exclude it and its children.

The shorter names used up to v1.2.0 (`data-format`, `data-event-format`,
`data-locale` and so on) still work, so pinned sites can move up a version
without editing markup. New sites should use the `data-date-` names.

Processed elements are marked `data-sqs-dates="done"`, `"skipped"` or
`"unparsed"`, which is the quickest way to see what happened in devtools.
`window.sqsDates` is exposed for debugging: `sqsDates.parse("18/06/2024")`,
`sqsDates.format(parts, "ddd D MMM YYYY")`, `sqsDates.scan()`,
`sqsDates.config`.

## Inlining it instead

Linking the hosted file is the intended route. If you must paste the source
directly into Code Injection, wrap it in `<script>` tags yourself and know that
a literal `</script>` anywhere in the JavaScript, even inside a comment, ends
the block early and dumps the rest of the code onto the page as visible text.
The source is kept free of that sequence for exactly this reason.

## Credits

The useful groundwork on which Squarespace elements carry dates, and the idea
of falling back to the `datePublished` schema markup, came from a public
Squarespace forum thread:
<https://forum.squarespace.com/topic/207841-freeshare-date-display-format-options-on-all-pages/>

No code from that thread is used here, and none from
[date.format.js](https://blog.stevenlevithan.com/archives/date-time-format)
by Steven Levithan, which the thread's snippet loads. This is a fresh
implementation with a different parser, a different formatter and a different
update strategy, and it has no external dependency to keep alive. Token names
follow the day.js and Moment convention rather than that library's, which reads
`MM` as minutes.

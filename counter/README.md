# sqs-counter

Numbers that count up when they scroll into view, on a Squarespace 7.1 site.
No dependencies.

Write the number the way you want it to finish, and it counts up to exactly
that. `1,000` keeps its comma. `12.5` keeps its one decimal. `$6bn+` counts the
6 and leaves the rest alone.

## Install

Settings > Advanced > Code Injection > **Header**:

```html
<script src="https://cdn.jsdelivr.net/gh/3bdigital/squarespace-tools@v1.5.0/counter/sqs-counter.min.js"></script>
```

Header, not footer, so a `{{101}}` you type into a text block is replaced
before the page paints rather than after. See
[Header or footer](#header-or-footer).

Then, in an ordinary Squarespace **text block**, type your number in double
braces:

```text
{{101}}
Countries in which Field has operated
```

Style that text block however you like: heading level, font, size, colour,
alignment, all of it. The counter replaces only the number, so it inherits
everything you set.

That is the whole setup. Nothing else is required, on the tag or on the page.

## What you type is what you get

The number you write is the finished display, exactly. Nothing is added to it
and nothing is taken away.

| You type | It counts to | Why |
| --- | --- | --- |
| `{{101}}` | 101 | plain |
| `{{1,000}}` | 1,000 | you wrote a separator, so it keeps grouping |
| `{{1000}}` | 1000 | you did not, so it does not |
| `{{12.5}}` | 12.5 | one decimal in, one decimal out |
| `{{12.50}}` | 12.50 | two in, two out |
| `{{$6bn+}}` | $6bn+ | it counts the 6, the rest rides along |
| `{{1,000+}}` | 1,000+ | same |
| `{{100>0}}` | 100 down to 0 | `>` reads as "to" |
| `{{-40}}` | -40 | negatives are fine |

Put the whole finished thing inside the braces, including any `$`, `%` or `+`.
Anything you leave outside still displays, but only what is inside gets its
width held while the number grows, so `{{1,000+}}` sits still and
`{{1,000}}+` nudges the `+` along as digits arrive.

On a site whose language is not English, write the number the way that language
writes it: `{{1.234,5}}` on a German site. The language comes from your
Squarespace site settings.

## Setting options on a marker

Anything after a pipe sets options, using the attribute names from
[the table below](#every-attribute) without the `data-counter-` prefix. A bare
time is the duration, because that is the one people reach for:

```text
{{101 | 5s}}
{{1,000,000,000 | 4s step=10000000}}
{{12.5 | suffix="%" easing=linear}}
{{100>0 | 3s fps=10}}
```

Quote a value that has spaces in it, `suffix=" per year"`. An option it does not
recognise is ignored rather than guessed at.

A row of stats staggered by 200ms, which is three text blocks or one:

```text
{{101 | delay=0}}   {{$6bn+ | delay=200ms}}   {{1,000+ | delay=400ms}}
```

Set anything that should apply to the whole site on the script tag instead, and
leave the markers clean:

```html
<script src="...@v1.5.0/counter/sqs-counter.min.js"
        data-counter-duration="2.5s"
        data-counter-easing="linear"></script>
```

A marker inside `<code>`, `<pre>`, `<kbd>` or `<samp>` is left exactly as
typed, so a page explaining this syntax does not rewrite its own examples.

## Duration or speed

By default every counter takes the same **2 seconds**, whatever it counts to.
Three stats side by side therefore finish together, which is almost always what
a row of stats wants:

```html
<script src="...@v1.5.0/counter/sqs-counter.min.js" data-counter-duration="2.5s"></script>
```

The alternative is a **speed** in units per second, where a bigger number takes
longer. At `data-counter-speed="50"`, 0 to 100 takes two seconds and 0 to 200
takes four:

```html
<script src="...@v1.5.0/counter/sqs-counter.min.js" data-counter-speed="50"></script>
```

Set both on the same tag and duration wins, with a note in the console. Set
speed on one counter and duration site-wide and the counter wins, because the
more specific setting always does.

A duration is capped at two minutes.

## Making it readable rather than a blur

The counter is driven by elapsed time, not by frames, so it takes the same
2 seconds on a 60Hz laptop, a 120Hz phone and a browser dropping frames. Two
things control what you actually see on the way:

`data-counter-fps` is how many times a second the number may change, 30 by
default. Drop it to 10 for a slower, more deliberate tick.

`data-counter-step` is what the number counts in. Without it, it counts in
whole units (or in 0.1s if you asked for one decimal). With it, the display
snaps to multiples:

```html
<span class="sqs-counter" data-counter-step="10000000">1,000,000,000</span>
```

That keeps the last seven digits at zero the whole way up, so a billion reads
as a number climbing rather than nine digits scrambling.

The step never changes when the count finishes, only what it shows on the way.
It also never overshoots: the display lands on a step at or behind where the
animation actually is, and the final frame is your number exactly, whether or
not the step divides evenly. `data-counter-step="10"` up to `95` still ends on
95.

## Code blocks, when you want them

Between the script tag and the pipe options, a text block covers everything.
A **code block** is worth it when the counter is not really running text: a
number you want to give its own class and style in Custom CSS, or markup you
want to paste identically across several sites.

```html
<span class="sqs-counter">1,000</span>
```

The element's own text is both the target and the fallback if the script never
loads. Then add whatever you want to change, as attributes this time:

```html
<span class="sqs-counter"
      data-counter-from="100"
      data-counter-to="0"
      data-counter-duration="3s"
      data-counter-step="5">100</span>
```

Code block text is styled by your site's body font, not your heading styles, so
a big display number built in one cannot be styled with Squarespace's own text
controls. That is the reason to prefer a text block and `{{ }}` for anything
the design cares about.

The two forms are the same thing underneath: a marker becomes exactly this
element, attributes and all. Convert a marker to markup by reading it off in
devtools.

## Every attribute

The same names work in two places: on the script tag, where they set the
default for every counter on the site, and on an individual counter, where they
override it.

| Attribute | Default | What it does |
| --- | --- | --- |
| `data-counter-to` | the element's own text | the number to finish on |
| `data-counter-from` | `0` | the number to start from |
| `data-counter-duration` | `2s` | how long the whole count takes, `2s`, `1500ms` or a bare number of ms |
| `data-counter-speed` | none | units per second, instead of a duration |
| `data-counter-delay` | `0` | wait before starting, for staggering a row |
| `data-counter-step` | one display unit | what the number counts in |
| `data-counter-fps` | `30` | most changes a second |
| `data-counter-decimals` | from the number you wrote | decimal places |
| `data-counter-grouping` | from the number you wrote | thousands separators, `true` or `false` |
| `data-counter-locale` | the site language | which separators, `en-GB`, `de-DE` |
| `data-counter-prefix` | from the element's text | text before the number |
| `data-counter-suffix` | from the element's text | text after the number |
| `data-counter-easing` | `out` | `out` slows into the finish, `linear` is steady, `in-out` eases both ends |
| `data-counter-trigger` | `visible` | `visible` waits for the scroll, `immediate` starts on load |
| `data-counter-once` | `true` | `false` replays every time it scrolls back into view |
| `data-counter-reserve` | `true` | hold the finished width from the start, so the line does not shuffle |
| `data-counter-a11y` | `static` | `off` removes the screen reader handling below |
| `data-counter-debug` | `false` | `true` logs anything it could not read |

In a marker, drop the `data-counter-` prefix: `{{101 | duration=3s step=5}}`.

Script tag only:

| Attribute | Default | What it does |
| --- | --- | --- |
| `data-counter-selector` | `.sqs-counter, [data-counter-to]` | which elements are counters |
| `data-counter-text` | `true` | `false` turns off `{{ }}` in text blocks |
| `data-counter-text-scope` | `.sqs-block-html, .sqs-block-markdown, [data-counter-scan]` | which blocks are searched for `{{ }}` |
| `data-counter-hide` | off | hide text until the markers are gone, `true` or a selector. See [If you see the braces](#if-you-see-the-braces) |

Add `data-counter-skip` to any element to leave it and its children alone.

## Check the live site, not the editor or the preview

**Counters do not run in the Squarespace editor or in preview mode, and you
will see a raw `{{101}}` there. This is deliberate, and it is not a sign the
script has failed.**

Squarespace loads your site inside a frame for both, and the editor reads the
live DOM when it saves. A script that rewrites content there risks having its
own output written into your saved page, which for this one would mean your
`{{101}}` being permanently replaced by a `<span>`. So it detects the frame and
does nothing at all.

| Where you are looking | Counters run? |
| --- | --- |
| Editor | no, you see `{{101}}` |
| Preview, the arrow button | no, you see `{{101}}` |
| Live site in a normal tab | yes |
| Live site while logged in | yes |

Preview is the one that catches people out: it hides the admin chrome and
rewrites the address bar to the real page URL, so it looks like the live site
while still being framed. Open the site in an ordinary tab. If you are not
sure which you are looking at, open the console, where the script says when it
has skipped a page and why.

## Header or footer

Put the tag in the **Header** if you use `{{ }}` in text blocks, with no `defer`
and no `async`. The script then installs itself before any of the page body has
been parsed, and converts each marker as its text arrives, ahead of the paint.

From the footer it cannot run until the whole page has been parsed, so the
braces are on screen first, every time. Same for `defer`, which means the same
thing.

Code block counters are safe either way, because their markup already contains
the finished number.

## If you see the braces

A `{{101}}` visible before it turns into a number is one of four things, in the
order worth checking:

**You are in the editor or preview.** Then it is not a flash, it is permanent
and deliberate. See
[the section above](#check-the-live-site-not-the-editor-or-the-preview).

**The tag is in the footer, or has `defer` on it.** Move it to the header and
take `defer` off.

**The tag is in the header and you still catch it.** Paste this into the
console on the live page:

```js
sqsCounter.config.text        // false means marker scanning is off
document.querySelectorAll('[data-sqs-counter]').length   // 0 means none were found
```

If the count is right, the markers are being converted, just not quite before
the paint. How the page arrives over the network decides that, and it is not
something a script can guarantee from inside the page.

**So take the certain route.** `data-counter-hide` hides the text until the
markers are gone:

```html
<script src="...@v1.5.0/counter/sqs-counter.min.js" data-counter-hide="true"></script>
```

`true` covers every block a marker can appear in, which on most sites is all
the text on the page. Better, name the one place your counters live, so the
rest of the page is untouched:

```html
<script src="...@v1.5.0/counter/sqs-counter.min.js" data-counter-hide="#stats"></script>
```

Either way it trades a moment of missing text for a moment of braces, which is
the better of the two, and the text is revealed again as soon as the page is
parsed. If anything goes wrong before that, it is revealed after four seconds
regardless, so a broken script cannot leave a blank page behind.

A code block counter never has this problem at all, because its markup already
holds the finished number. That is the reason to use one for a stat above the
fold on a page you cannot test.

## What it does about motion and screen readers

If the visitor has asked their system for less motion, nothing animates. The
number appears at its final value straight away, because the number is the
content, not decoration.

Screen readers get the finished number, once. The animating text is
`aria-hidden`, and a visually hidden copy of the final value sits beside it, so
nobody hears "one, two, three, four" for two seconds and nobody is read a `0`
that was about to become 1,000. `data-counter-a11y="off"` removes both if you
would rather handle it yourself.

Counters wait until they scroll into view, and a backgrounded tab pauses rather
than skipping to the end, so a count you never saw start is still there to watch
when you arrive.

## The width does not jump

Before it starts, each counter measures the width of its finished number and
holds it. Otherwise a centred stat shuffles sideways for two seconds as digits
arrive. Digits are set in tabular figures for the same reason. Turn it off with
`data-counter-reserve="false"`.

## From JavaScript

`window.sqsCounter` is there for anything the attributes do not cover.

```js
sqsCounter.run(el, { from: 0, to: '1,000', duration: 2500, step: 50 });
sqsCounter.stop(el);      // leave it where it is
sqsCounter.reset(el);     // back to the start value
sqsCounter.destroy(el);   // put the original markup back
sqsCounter.scan();        // pick up anything newly added
```

`sqsCounter.parse('$6bn+')` reports what it read from a piece of text, and
`sqsCounter.sample({ to: '1,000' }, 0.5)` gives the string that configuration
displays halfway through, which is the quickest way to check a setting without
watching it.

`sqsCounter.config` holds the site-wide defaults.

Counters carry `data-sqs-counter="ready"`, `"running"`, `"done"`, `"skipped"`
or `"unparsed"`, which is the quickest way to see what happened in devtools.

## Limits

Numbers are ordinary JavaScript numbers, exact up to 9,007,199,254,740,991
(just over nine quadrillion). Above that the last digits drift, and
`data-counter-debug="true"` says so. Nine-figure and ten-figure stats are far
inside the limit.

Scientific notation is not accepted. Write `1000000` or `1,000,000`.

The script does nothing at all on a page with no counters on it beyond one
selector query, so it is fine to load site-wide.

## Development

```sh
./build.sh    # minifies both tools and runs the tests
```

Edit `counter/sqs-counter.js` only. The `.min.js` is generated.

`counter/demo.html` is a page of every mode side by side. Serve the repo and
open it:

```sh
python3 -m http.server 8177
```

Then <http://localhost:8177/counter/demo.html>, with `?min=1` to check the
built file, `?reduced=1` to see the reduced-motion path and `?nio=1` to see the
fallback for browsers with no `IntersectionObserver`.

`counter/test-flash.html` reports whether the markers were converted before the
page finished parsing, and whether any braces survived it. `?footer=1` loads
the script the way footer injection would, for the comparison, and `?hide=1`
turns on `data-counter-hide`.

## Inlining it instead

Linking the hosted file is the intended route. If you must paste the source
into Code Injection, wrap it in `<script>` tags yourself and know that a literal
closing script tag anywhere in the JavaScript, even inside a comment, ends the
block early and dumps the rest of the code onto the page as visible text. The
source is kept free of that sequence for exactly this reason.

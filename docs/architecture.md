# Architecture

One file per tool, no runtime dependencies, no build step for consumers.

```mermaid
flowchart TD
    subgraph repo["squarespace-tools"]
        SRC["dates/sqs-dates.js<br/>parser + formatter + DOM scanner"]
        BUILD["build.sh (terser)"]
        MIN["dates/sqs-dates.min.js"]
        SRC --> BUILD --> MIN
    end

    subgraph cdn["Delivery"]
        TAG["git tag v1.2.0"]
        JSD["jsDelivr<br/>cdn.jsdelivr.net/gh/..."]
        MIN --> TAG --> JSD
    end

    subgraph site["Any Squarespace 7.1 site"]
        INJ["Code Injection footer<br/>one script tag + data-format"]
        GUARD{"framed by<br/>the editor?"}
        STOP["do nothing<br/>no writes, no markers"]
        SCAN["scan(): querySelectorAll(include)"]
        SKIP{"matches<br/>exclude?"}
        RESOLVE["resolve(el)"]
        A1["1. datetime attr, if real ISO"]
        A2["2. visible text, locale-aware parse"]
        A3["3. meta itemprop=datePublished<br/>item pages only"]
        PICK{"event?"}
        FMT["format(parts, format)"]
        EFMT["format(parts, eventFormat)"]
        WRITE["write innermost node<br/>+ fix datetime attr"]
        OBS["MutationObserver<br/>load more / ajax"]

        INJ --> GUARD
        GUARD -->|yes| STOP
        GUARD -->|no| SCAN
        SCAN --> SKIP
        SKIP -->|yes| STOP
        SKIP -->|no| RESOLVE
        RESOLVE --> A1 --> A2 --> A3
        A3 --> PICK
        PICK -->|no| FMT --> WRITE
        PICK -->|yes| EFMT --> WRITE
        OBS --> SCAN
    end

    JSD --> INJ

    classDef step fill:#1b5e20,stroke:#2e7d32,color:#fff
    class SRC,BUILD,MIN,TAG,JSD,INJ,GUARD,STOP,SCAN,SKIP,RESOLVE,A1,A2,A3,PICK,FMT,EFMT,WRITE,OBS step
```

A second tool would be a new folder alongside `dates/`, the same
one-file-one-script-tag shape, and a row in the root README.

## Why the date is resolved in that order

Squarespace is inconsistent about what it gives you:

| Surface | Machine-readable date? |
| --- | --- |
| Event list and event item | yes, a real ISO `datetime` |
| Blog post page | no, `datetime` holds a display string like `10 Apr` |
| Blog list and grid | no `datetime` at all |
| Summary blocks | no, and not a `<time>` element |

So the script takes whichever source it can get, in descending order of trust,
and refuses to guess when it has none. The `datetime` attribute goes first but
is distrusted unless it looks like ISO, because 7.1 puts display strings in it.

## Why it does not run in the editor

The editor loads the site in a frame and reads the live DOM when it saves. A
script that rewrites content there can have its changes, or its
`data-sqs-dates` markers, written into the saved page. The guard is a frame
check, which costs nothing because the live site is never framed.

## Why exclusions are exact class names

They started as substring matches, and `[class*="event-time"]` matched a
summary block's settings class,
`summary-block-setting-secondary-metadata-event-time`, silently excluding the
whole block. Squarespace encodes block configuration into class names, so
substring matching against them is unsafe. The exclusions name elements
exactly: event times, the day/month tiles, and calendar blocks.

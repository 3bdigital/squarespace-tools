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
        TAG["git tag v1.0.0"]
        JSD["jsDelivr<br/>cdn.jsdelivr.net/gh/..."]
        MIN --> TAG --> JSD
    end

    subgraph site["Any Squarespace 7.1 site"]
        INJ["Code Injection footer<br/>one script tag + data-format"]
        SCAN["scan(): querySelectorAll(include)"]
        RESOLVE["resolve(el)"]
        A1["1. datetime attr, if real ISO"]
        A2["2. visible text, locale-aware parse"]
        A3["3. meta itemprop=datePublished<br/>item pages only"]
        FMT["format(parts, pattern)"]
        WRITE["write innermost node<br/>+ fix datetime attr"]
        OBS["MutationObserver<br/>load more / ajax"]

        INJ --> SCAN --> RESOLVE
        RESOLVE --> A1 --> A2 --> A3
        A3 --> FMT --> WRITE
        OBS --> SCAN
    end

    JSD --> INJ

    classDef built fill:#1b5e20,stroke:#2e7d32,color:#fff
    class SRC,BUILD,MIN,TAG,JSD,INJ,SCAN,RESOLVE,A1,A2,A3,FMT,WRITE,OBS built
```

Everything is built. Adding a second tool means a new folder alongside
`dates/`, the same one-file-one-script-tag shape, and a row in the root README.

## Why the date is resolved in that order

Squarespace gives a machine-readable date on item pages only, and a
locale-formatted string everywhere else. Neither is available in both places,
so the script takes whichever it can get and refuses to guess when it has
neither. The `datetime` attribute goes first but is distrusted unless it looks
like ISO, because 7.1 puts display strings in it.

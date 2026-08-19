/*!
 * sqs-dates.js - consistent date formatting for Squarespace 7.1
 *
 * Load it and give it a format. Nothing else to configure: it finds every
 * article date on the page, works out what Squarespace rendered, and rewrites
 * it. Locale and timezone are read from the site itself.
 *
 * Install: see README. MIT licensed.
 *
 * Format tokens (day.js style):
 *   YYYY 2025   YY 25
 *   MMMM December   MMM Dec   MM 12   M 12
 *   DD 01   D 1   Do 1st
 *   dddd Monday   ddd Mon
 *   HH 09   H 9   hh 09   h 9   mm 05   m 5   ss 03   s 3   A PM   a pm
 *   [literal text in brackets is not parsed]
 *
 * "1 December 2025" is D MMMM YYYY
 */
(function () {
  'use strict';

  var CTX = (window.Static && window.Static.SQUARESPACE_CONTEXT) || {};
  var SITE = CTX.website || {};
  var SCRIPT = document.currentScript;

  var DONE = 'data-sqs-dates';

  // Elements Squarespace uses for article / blog / summary dates.
  var INCLUDE = [
    'time.blog-date',                 // blog list + grid layouts
    'time.dt-published',              // blog post page
    '.blog-meta-item--date',          // blog post page + list meta
    '.summary-metadata-item--date',   // summary blocks, posts and events
    '.blog-basic-grid--meta time',    // grid layout meta
    'time.event-date',                // event list + event item pages
    'time[pubdate]',
    'time[datetime]'
  ].join(',');

  // Event dates are formatted like everything else. Three things are not:
  // times, which carry a start and an end; the big day/month tiles, whose
  // layout a full date would wreck; and calendar blocks, which are bare day
  // numbers in a grid.
  //
  // These are exact class names rather than substring matches on purpose. A
  // summary block carries settings classes like
  // "summary-block-setting-secondary-metadata-event-time", and matching
  // [class*="event-time"] against those silently excluded the whole block.
  var EXCLUDE = [
    '[data-sqs-dates-skip]',
    '[class*="yui3-calendar"]',          // calendar block grid and header
    '.sqs-block-calendar',
    '.eventlist-datetag',                // event list day/month tile
    '.summary-thumbnail-event-date',     // summary thumbnail tile
    '.event-time-12hr',
    '.event-time-24hr',
    '.event-time-localized',
    'time.event-time-localized-start',
    'time.event-time-localized-end',
    '.summary-metadata-item--event-time'
  ].join(',');

  var cfg = {
    format: 'D MMMM YYYY',
    eventFormat: null,                  // falls back to format
    locale: SITE.language || document.documentElement.lang || 'en-GB',
    timeZone: SITE.timeZone || null,
    include: INCLUDE,
    exclude: EXCLUDE,
    debug: false
  };

  // Config comes from data-* attributes on the script tag. Nothing else is
  // needed: locale and timezone come from the site, and every attribute is
  // optional.
  if (SCRIPT && SCRIPT.dataset) {
    if (SCRIPT.dataset.format)      cfg.format      = SCRIPT.dataset.format;
    if (SCRIPT.dataset.eventFormat) cfg.eventFormat = SCRIPT.dataset.eventFormat;
    if (SCRIPT.dataset.locale)   cfg.locale   = SCRIPT.dataset.locale;
    if (SCRIPT.dataset.timezone) cfg.timeZone = SCRIPT.dataset.timezone;
    if (SCRIPT.dataset.include)  cfg.include  = SCRIPT.dataset.include;
    if (SCRIPT.dataset.exclude)  cfg.exclude  = SCRIPT.dataset.exclude;
    if (SCRIPT.dataset.debug === 'true') cfg.debug = true;
  }

  // Never run inside the Squarespace editor. The editor loads the site in a
  // frame and reads the live DOM when it saves, so any script that rewrites
  // content there risks having its changes, or its marker attributes, written
  // into the page itself. The live site is never framed, so this costs nothing.
  function inEditor() {
    try {
      if (window.self !== window.top) return true;
    } catch (e) {
      return true; // cross-origin parent means we are framed by something
    }
    var root = document.documentElement, body = document.body;
    return /(^|\s)sqs-edit-mode/.test(root.className) ||
           !!(body && /(^|\s)sqs-edit-mode/.test(body.className));
  }

  if (inEditor()) return;

  function warn() {
    if (cfg.debug && window.console) console.warn.apply(console, ['[sqs-dates]'].concat([].slice.call(arguments)));
  }

  /* ---------- date parts ---------------------------------------------- */
  // A "parts" object is {y, m, d, H, M, S, hasTime}. Plain numbers, no
  // timezone attached, so nothing can shift across midnight on the way out.

  function partsFromInstant(date) {
    var opts = { year: 'numeric', month: '2-digit', day: '2-digit',
                 hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };
    if (cfg.timeZone) opts.timeZone = cfg.timeZone;
    var got = {};
    new Intl.DateTimeFormat('en-GB', opts).formatToParts(date).forEach(function (p) { got[p.type] = p.value; });
    var H = parseInt(got.hour, 10);
    if (H === 24) H = 0; // some engines report midnight as 24 with hour12:false
    return { y: +got.year, m: +got.month, d: +got.day, H: H, M: +got.minute, S: +got.second, hasTime: true };
  }

  var EN_MONTHS = ['january','february','march','april','may','june',
                   'july','august','september','october','november','december'];

  var monthNamesCache = null;
  function monthNames() {
    if (monthNamesCache) return monthNamesCache;
    var list = [];
    var push = function (name, index) {
      name = String(name).toLowerCase().replace(/\.$/, '');
      if (name) list.push({ name: name, index: index });
    };
    for (var i = 0; i < 12; i++) {
      var ref = new Date(Date.UTC(2024, i, 15));
      push(new Intl.DateTimeFormat(cfg.locale, { month: 'long', timeZone: 'UTC' }).format(ref), i);
      push(new Intl.DateTimeFormat(cfg.locale, { month: 'short', timeZone: 'UTC' }).format(ref), i);
      // English too, for part-translated sites.
      push(EN_MONTHS[i], i);
      push(EN_MONTHS[i].slice(0, 3), i);
    }
    list.sort(function (a, b) { return b.name.length - a.name.length; }); // longest match wins
    monthNamesCache = list;
    return list;
  }

  var orderCache = null;
  function numericOrder() {
    if (orderCache) return orderCache;
    var parts = new Intl.DateTimeFormat(cfg.locale, { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'UTC' })
      .formatToParts(new Date(Date.UTC(2024, 4, 25)));
    orderCache = parts.filter(function (p) { return p.type === 'day' || p.type === 'month' || p.type === 'year'; })
                      .map(function (p) { return p.type; });
    if (orderCache.length !== 3) orderCache = ['day', 'month', 'year'];
    return orderCache;
  }

  function valid(y, m, d) {
    return y > 1000 && y < 3000 && m >= 1 && m <= 12 && d >= 1 && d <= 31;
  }

  function parse(str) {
    if (!str) return null;
    var s = String(str).replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
    if (!s) return null;

    // 1. ISO with a time and/or offset - a real instant.
    if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/.test(s)) {
      // Squarespace writes offsets as +0100; older Safari wants +01:00.
      var dt = new Date(s.replace(' ', 'T').replace(/([+-]\d{2})(\d{2})$/, '$1:$2'));
      if (!isNaN(dt)) return partsFromInstant(dt);
    }

    // 2. ISO date only - keep it as plain numbers, no timezone conversion.
    var iso = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (iso && valid(+iso[1], +iso[2], +iso[3])) {
      return { y: +iso[1], m: +iso[2], d: +iso[3], hasTime: false };
    }

    // 3. Month name somewhere in the string ("18 June 2024", "Jun 18, 2024").
    var lower = s.toLowerCase();
    var names = monthNames();
    for (var i = 0; i < names.length; i++) {
      var at = lower.indexOf(names[i].name);
      if (at === -1) continue;
      var rest = (lower.slice(0, at) + ' ' + lower.slice(at + names[i].name.length)).replace(/[.,]/g, ' ');
      var yearMatch = rest.match(/\b(\d{4})\b/);
      if (!yearMatch) break;              // no year, cannot trust it - fall through
      var withoutYear = rest.replace(yearMatch[0], ' ');
      var dayMatch = withoutYear.match(/\b(\d{1,2})(?:st|nd|rd|th)?\b/);
      if (!dayMatch) break;
      if (valid(+yearMatch[1], names[i].index + 1, +dayMatch[1])) {
        return { y: +yearMatch[1], m: names[i].index + 1, d: +dayMatch[1], hasTime: false };
      }
      break;
    }

    // 4. All numeric ("18/06/2024", "6/18/24", "18.06.2024"). Use the site
    //    locale to decide day-first vs month-first.
    var nums = s.match(/\d+/g);
    if (nums && nums.length >= 3) {
      nums = nums.slice(0, 3);
      var order = numericOrder();
      var slot = { day: null, month: null, year: null };
      var leftovers = [];

      // A 4-digit number is the year wherever it sits.
      nums.forEach(function (n, idx) {
        if (n.length === 4) { slot.year = +n; leftovers.push(null); }
        else leftovers.push({ value: +n, pos: idx });
      });

      var seq = order.filter(function (t) { return slot.year === null || t !== 'year'; });
      var remaining = leftovers.filter(Boolean);

      if (slot.year === null && remaining.length === 3) {
        order.forEach(function (t, i) { slot[t] = remaining[i].value; });
        if (slot.year < 100) slot.year += slot.year < 70 ? 2000 : 1900;
      } else if (remaining.length === 2) {
        var dayFirst = seq.indexOf('day') < seq.indexOf('month');
        // A value over 12 can only be the day, whatever the locale says.
        if (remaining[0].value > 12) dayFirst = true;
        else if (remaining[1].value > 12) dayFirst = false;
        slot.day = dayFirst ? remaining[0].value : remaining[1].value;
        slot.month = dayFirst ? remaining[1].value : remaining[0].value;
      }

      // If the locale's reading is impossible (month 18), the site is not
      // rendering in its own locale - swap day and month.
      if (!valid(slot.year, slot.month, slot.day) && valid(slot.year, slot.day, slot.month)) {
        var swap = slot.day; slot.day = slot.month; slot.month = swap;
      }

      if (valid(slot.year, slot.month, slot.day)) {
        return { y: slot.year, m: slot.month, d: slot.day, hasTime: false };
      }
    }

    return null;
  }

  /* ---------- formatting ----------------------------------------------- */

  function pad(n) { return n < 10 ? '0' + n : String(n); }

  function ordinal(n) {
    if (!/^en/i.test(cfg.locale)) return String(n);
    var rem100 = n % 100, rem10 = n % 10;
    if (rem100 >= 11 && rem100 <= 13) return n + 'th';
    return n + (rem10 === 1 ? 'st' : rem10 === 2 ? 'nd' : rem10 === 3 ? 'rd' : 'th');
  }

  function named(p, opts) {
    // Build a UTC date from the plain parts and read names back in UTC, so the
    // visitor's own timezone can never shift the answer.
    var ref = new Date(Date.UTC(p.y, p.m - 1, p.d, 12));
    opts.timeZone = 'UTC';
    return new Intl.DateTimeFormat(cfg.locale, opts).format(ref);
  }

  var TOKENS = /\[([^\]]*)\]|YYYY|YY|MMMM|MMM|MM|M|DD|Do|D|dddd|ddd|HH|H|hh|h|mm|m|ss|s|A|a/g;

  function format(p, pattern) {
    var H = p.H || 0, h12 = H % 12 || 12;
    return pattern.replace(TOKENS, function (token, literal) {
      if (literal !== undefined) return literal;
      switch (token) {
        case 'YYYY': return String(p.y);
        case 'YY':   return pad(p.y % 100);
        case 'MMMM': return named(p, { month: 'long' });
        case 'MMM':  return named(p, { month: 'short' });
        case 'MM':   return pad(p.m);
        case 'M':    return String(p.m);
        case 'DD':   return pad(p.d);
        case 'Do':   return ordinal(p.d);
        case 'D':    return String(p.d);
        case 'dddd': return named(p, { weekday: 'long' });
        case 'ddd':  return named(p, { weekday: 'short' });
        case 'HH':   return pad(H);
        case 'H':    return String(H);
        case 'hh':   return pad(h12);
        case 'h':    return String(h12);
        case 'mm':   return pad(p.M || 0);
        case 'm':    return String(p.M || 0);
        case 'ss':   return pad(p.S || 0);
        case 's':    return String(p.S || 0);
        case 'A':    return H < 12 ? 'AM' : 'PM';
        case 'a':    return H < 12 ? 'am' : 'pm';
      }
      return token;
    });
  }

  /* ---------- DOM ------------------------------------------------------ */

  // The page-level datePublished only describes the page's own item. Using it
  // on a list page would stamp one date onto every entry, so it is only
  // allowed where Squarespace says we are on an item page.
  var itemPageCache = null;
  function isItemPage() {
    if (itemPageCache === null) {
      itemPageCache = !!CTX.item || document.querySelectorAll(cfg.include).length === 1;
    }
    return itemPageCache;
  }

  // Find the date for one element, best source first.
  function resolve(el) {
    var attr = el.getAttribute && el.getAttribute('datetime');
    if (attr && /^\d{4}-\d{2}-\d{2}/.test(attr)) {
      var fromAttr = parse(attr);
      if (fromAttr) return fromAttr;
    }

    var fromText = parse(el.textContent);
    if (fromText) return fromText;

    // Squarespace often renders a machine-readable date in the item's schema
    // markup even when the visible one is useless ("10 Apr" with no year).
    var scope = el.closest('article, .blog-item, .entry, .summary-item, [data-item-id]');
    var meta = scope && scope.querySelector('[itemprop="datePublished"][content], [itemprop="dateCreated"][content]');
    if (!meta && isItemPage()) {
      var all = document.querySelectorAll('[itemprop="datePublished"][content]');
      if (all.length === 1) meta = all[0];
    }
    if (meta) {
      var fromMeta = parse(meta.getAttribute('content'));
      if (fromMeta) return fromMeta;
    }

    return null;
  }

  // Events can take their own format, so a site can keep the weekday on an
  // event and drop it everywhere else.
  function isEvent(el) {
    return /(^|\s)event-date(\s|$)/.test(el.className) ||
           !!el.closest('.summary-item-record-type-event, .eventlist-event, .eventitem');
  }

  // Write into the innermost wrapper so theme styling and links survive.
  function target(el) {
    var node = el;
    while (node.children.length === 1 && node.textContent.trim() === node.firstElementChild.textContent.trim()) {
      node = node.firstElementChild;
    }
    return node;
  }

  function apply(el) {
    if (el.hasAttribute(DONE)) return;
    if (cfg.exclude && el.closest(cfg.exclude)) { el.setAttribute(DONE, 'skipped'); return; }

    var p = resolve(el);
    if (!p) {
      el.setAttribute(DONE, 'unparsed');
      warn('could not read a date from', el, JSON.stringify(el.textContent.trim()));
      return;
    }

    el.setAttribute(DONE, 'done'); // set first, so our own write cannot re-enter
    target(el).textContent = format(p, isEvent(el) ? (cfg.eventFormat || cfg.format) : cfg.format);
    if (el.tagName === 'TIME') {
      el.setAttribute('datetime', p.y + '-' + pad(p.m) + '-' + pad(p.d));
    }
  }

  function scan(root) {
    var nodes = (root || document).querySelectorAll(cfg.include);
    for (var i = 0; i < nodes.length; i++) apply(nodes[i]);
  }

  scan();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { scan(); });
  }
  window.addEventListener('load', function () { scan(); });

  // Blog "load more", lazy sections and ajax page changes all add dates later.
  var queued = false;
  new MutationObserver(function (records) {
    if (queued) return;
    var added = false;
    for (var i = 0; i < records.length; i++) {
      if (records[i].addedNodes.length) { added = true; break; }
    }
    if (!added) return;
    queued = true;
    requestAnimationFrame(function () { queued = false; scan(); });
  }).observe(document.documentElement, { childList: true, subtree: true });

  window.sqsDates = { scan: scan, parse: parse, format: format, config: cfg };
})();

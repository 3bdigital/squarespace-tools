/*!
 * sqs-counter.js - animated number counters for Squarespace 7.1
 *
 * Write the finished number the way you want it to end up, and it counts up
 * to exactly that. "1,000" keeps its comma, "12.5" keeps its one decimal,
 * "$6bn+" counts the 6 and leaves the rest alone.
 *
 * Two ways to use it:
 *
 *   Text block   Type {{101}} in an ordinary Squarespace text block and style
 *                the block however you like. The counter inherits the styling
 *                because it replaces only the number.
 *
 *   Code block   <span class="sqs-counter">1,000</span>, with optional
 *                data-counter-* attributes for anything you want to change.
 *
 * Install: see README. MIT licensed.
 */
(function () {
  'use strict';

  var CTX = (window.Static && window.Static.SQUARESPACE_CONTEXT) || {};
  var SITE = CTX.website || {};
  var SCRIPT = document.currentScript;

  var DONE = 'data-sqs-counter';
  var SKIP = '[data-counter-skip]';
  // Somewhere a {{101}} is being shown rather than used. Leave those alone, or
  // a page explaining the syntax rewrites its own examples.
  var NO_MARKERS = 'code, pre, kbd, samp, [data-counter-skip]';

  var cfg = {
    // What to look at.
    selector: '.sqs-counter, [data-counter-to]',
    text: true,
    textScope: '.sqs-block-html, .sqs-block-markdown, .sqs-block-code, [data-counter-scan]',

    // Per counter, all overridable on the element itself.
    from: null,          // literal string or number, default 0
    to: null,            // literal string or number, default the element's own text
    duration: 2000,      // ms for the whole count, whatever the range
    speed: null,         // units per second, an alternative to duration
    delay: 0,            // ms before it starts, for staggering a row of stats
    step: null,          // display quantum, default one unit of the precision
    decimals: null,      // default read from the number you wrote
    grouping: null,      // default read from the number you wrote
    locale: SITE.language || document.documentElement.lang || 'en-GB',
    prefix: null,
    suffix: null,
    trigger: 'visible',  // or 'immediate'
    once: true,
    easing: 'out',       // 'out', 'linear', 'in-out'
    fps: 30,             // most repaints a second, so the digits stay readable
    reserve: true,       // hold the final width, so the line does not jump
    a11y: 'static',      // or 'off'
    hide: null,          // selector, or true, to hide until the markers are gone
    debug: false
  };

  function has(v) { return v !== undefined && v !== null && v !== ''; }

  function bool(v, fallback) {
    if (!has(v)) return fallback;
    return !/^(false|0|no|off)$/i.test(String(v).trim());
  }

  function num(v, fallback) {
    var n = parseFloat(v);
    return isFinite(n) ? n : fallback;
  }

  // Durations accept "2s", "1500ms" or a bare number of milliseconds.
  function time(v, fallback) {
    var s = String(v).trim();
    var m = s.match(/^([-+]?[\d.]+)\s*(ms|s)?$/i);
    if (!m || !isFinite(parseFloat(m[1]))) return fallback;
    var n = parseFloat(m[1]);
    return /^s$/i.test(m[2] || '') ? n * 1000 : n;
  }

  // Options given as a plain object, to the JavaScript API or in a {{marker}}.
  // Duration and speed answer the same question, so duration wins wherever it
  // is given, exactly as it does on a tag.
  function merge(o, options) {
    if (!options) return o;
    for (var k in options) {
      if (Object.prototype.hasOwnProperty.call(options, k) && has(options[k])) o[k] = options[k];
    }
    if (has(options.duration)) o.speed = null;
    return o;
  }

  function copy(o) {
    var out = {};
    for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) out[k] = o[k];
    return out;
  }

  function warn() {
    if (cfg.debug && window.console) console.warn.apply(console, ['[sqs-counter]'].concat([].slice.call(arguments)));
  }

  /* ---------- options -------------------------------------------------- */

  // The same data-counter-* names work on the script tag, where they set the
  // default for the whole site, and on any counter, where they override it.
  function applyAttrs(o, ds) {
    if (!ds) return o;

    if (has(ds.counterHide))      o.hide      = ds.counterHide;
    if (has(ds.counterSelector))  o.selector  = ds.counterSelector;
    if (has(ds.counterText))      o.text      = bool(ds.counterText, o.text);
    if (has(ds.counterTextScope)) o.textScope = ds.counterTextScope;

    if (has(ds.counterFrom))     o.from   = ds.counterFrom;
    if (has(ds.counterTo))       o.to     = ds.counterTo;
    if (has(ds.counterDelay))    o.delay  = Math.max(0, time(ds.counterDelay, o.delay));
    if (has(ds.counterLocale))   o.locale = ds.counterLocale;
    if (has(ds.counterPrefix))   o.prefix = ds.counterPrefix;
    if (has(ds.counterSuffix))   o.suffix = ds.counterSuffix;
    if (has(ds.counterOnce))     o.once   = bool(ds.counterOnce, o.once);
    if (has(ds.counterReserve))  o.reserve = bool(ds.counterReserve, o.reserve);
    if (has(ds.counterDebug))    o.debug  = bool(ds.counterDebug, o.debug);
    if (has(ds.counterA11y))     o.a11y   = /^off$/i.test(ds.counterA11y) ? 'off' : 'static';
    if (has(ds.counterTrigger))  o.trigger = /^imm/i.test(ds.counterTrigger) ? 'immediate' : 'visible';
    if (has(ds.counterEasing))   o.easing  = /^lin/i.test(ds.counterEasing) ? 'linear'
                                           : /^in/i.test(ds.counterEasing) ? 'in-out' : 'out';

    if (has(ds.counterFps))      o.fps = Math.min(120, Math.max(1, num(ds.counterFps, o.fps)));
    if (has(ds.counterDecimals)) o.decimals = Math.min(10, Math.max(0, Math.round(num(ds.counterDecimals, 0))));
    if (has(ds.counterGrouping)) o.grouping = bool(ds.counterGrouping, true);

    if (has(ds.counterStep)) {
      var step = num(ds.counterStep, 0);
      if (step > 0 && isFinite(step)) o.step = step;
      else warn('ignoring data-counter-step="' + ds.counterStep + '": it must be a positive number');
    }

    // Speed and duration answer the same question, so the more local one wins,
    // and duration wins if both are set on the same tag.
    if (has(ds.counterSpeed)) {
      var speed = num(ds.counterSpeed, 0);
      if (speed > 0 && isFinite(speed)) { o.speed = speed; }
      else warn('ignoring data-counter-speed="' + ds.counterSpeed + '": it must be a positive number');
    }
    if (has(ds.counterDuration)) {
      if (has(ds.counterSpeed)) warn('duration and speed are both set; duration wins');
      o.duration = Math.max(0, time(ds.counterDuration, o.duration));
      o.speed = null;
    }

    return o;
  }

  /* ---------- reading the number you wrote ------------------------------ */

  function esc(s) { return String(s).replace(/[\\^$.*+?()[\]{}|]/g, '\\$&'); }

  var sepCache = {};
  function separators(locale) {
    if (sepCache[locale]) return sepCache[locale];
    var s = { group: ',', decimal: '.' };
    try {
      new Intl.NumberFormat(locale, { useGrouping: true, minimumFractionDigits: 1 })
        .formatToParts(12345.6).forEach(function (p) {
          if (p.type === 'group') s.group = p.value;
          if (p.type === 'decimal') s.decimal = p.value;
        });
    } catch (e) { /* keep the en-GB defaults */ }
    sepCache[locale] = s;
    return s;
  }

  // Pulls the number out of a piece of display text and reports how it was
  // written, because how you wrote it is how it ends up: "1,000" is grouped,
  // "12.50" has two decimals, and anything either side is prefix and suffix.
  function parse(text, locale) {
    if (text === undefined || text === null) return null;
    var s = String(text).replace(/[\u00a0\u202f]/g, ' ').trim();
    if (!s) return null;

    var sep = separators(locale || cfg.locale);
    var m = s.match(/[-+]?\d[\d\s.,'\u2019]*/);
    if (!m) return null;

    var literal = m[0].replace(/[\s.,'\u2019]+$/, '');   // "1,000+" ends at the 0
    var prefix = s.slice(0, m.index);
    var suffix = s.slice(m.index + literal.length);

    var sign = 1, body = literal;
    if (body.charAt(0) === '-') { sign = -1; body = body.slice(1); }
    else if (body.charAt(0) === '+') body = body.slice(1);

    var grouping = false;
    var intPart = body, frac = '';

    var dpos = body.lastIndexOf(sep.decimal);
    if (dpos !== -1) {
      // Two or more of them evenly spaced is grouping, not a decimal point:
      // "1.234.567" is a million, "1.234" in en-GB is not.
      var asGroups = new RegExp('^\\d{1,3}(' + esc(sep.decimal) + '\\d{3}){2,}$');
      if (asGroups.test(body)) {
        grouping = true;
      } else {
        intPart = body.slice(0, dpos);
        frac = body.slice(dpos + 1);
      }
    }

    var groupRe = new RegExp('[' + esc(sep.group) + '\\s\'\u2019]', 'g');
    var intClean = intPart.replace(groupRe, '');
    if (intClean.length !== intPart.length) grouping = true;

    if (!/^\d+$/.test(intClean) || (frac && !/^\d+$/.test(frac))) return null;

    var value = sign * parseFloat(intClean + (frac ? '.' + frac : ''));
    if (!isFinite(value)) return null;

    return {
      value: value,
      decimals: frac.length,
      grouping: grouping,
      literal: literal,
      prefix: prefix,
      suffix: suffix
    };
  }

  /* ---------- formatting ------------------------------------------------ */

  var fmtCache = {};
  function formatter(locale, decimals, grouping) {
    var key = locale + '|' + decimals + '|' + grouping;
    if (!(key in fmtCache)) {
      try {
        fmtCache[key] = new Intl.NumberFormat(locale, {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
          useGrouping: !!grouping
        });
      } catch (e) { fmtCache[key] = null; }
    }
    return fmtCache[key];
  }

  function format(value, o) {
    var decimals = o && o.decimals ? o.decimals : 0;
    var f = formatter((o && o.locale) || cfg.locale, decimals, !!(o && o.grouping));
    return f ? f.format(value) : value.toFixed(decimals);
  }

  /* ---------- the plan --------------------------------------------------- */
  // Everything below the DOM: pure numbers in, a string out. All arithmetic is
  // done in whole "units" of the display precision, so 0.1 + 0.2 can never
  // surface as 0.30000000000000004.

  var EASINGS = {
    linear: function (t) { return t; },
    out: function (t) { return 1 - Math.pow(1 - t, 3); },
    'in-out': function (t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  };

  function buildPlan(o, affixes) {
    var to = parse(has(o.to) ? o.to : null, o.locale);
    if (!to) return null;

    var from = has(o.from) ? parse(o.from, o.locale) : null;
    if (has(o.from) && !from) { warn('could not read a start value from', o.from); return null; }

    var decimals = o.decimals !== null && o.decimals !== undefined
      ? o.decimals
      : Math.max(to.decimals, from ? from.decimals : 0);

    var grouping = o.grouping !== null && o.grouping !== undefined ? !!o.grouping : to.grouping;

    var scale = Math.pow(10, decimals);
    var toUnits = Math.round(to.value * scale);
    var fromUnits = from ? Math.round(from.value * scale) : 0;

    if (Math.abs(toUnits) > Number.MAX_SAFE_INTEGER) {
      warn('value beyond the safe integer range, the last digits will not be exact:', to.value);
    }

    var stepUnits = o.step ? Math.max(1, Math.round(o.step * scale)) : 1;

    var duration = o.speed
      ? Math.abs(toUnits - fromUnits) / scale / o.speed * 1000
      : o.duration;
    if (!isFinite(duration) || duration < 0) duration = 0;
    duration = Math.min(duration, 120000);
    if (toUnits === fromUnits) duration = 0;

    return {
      fromUnits: fromUnits,
      toUnits: toUnits,
      stepUnits: stepUnits,
      scale: scale,
      decimals: decimals,
      grouping: grouping,
      locale: o.locale,
      prefix: has(o.prefix) ? o.prefix : ((affixes && affixes.prefix) || ''),
      suffix: has(o.suffix) ? o.suffix : ((affixes && affixes.suffix) || ''),
      ease: EASINGS[o.easing] || EASINGS.out,
      duration: duration,
      delay: o.delay || 0,
      frame: 1000 / (o.fps || 30)
    };
  }

  // The displayed value never runs past the target: it lands on a step at or
  // behind where the animation actually is, and the last frame is the target
  // itself, whether or not the step divides the range evenly.
  function unitsAt(plan, t) {
    if (t >= 1) return plan.toUnits;
    if (t <= 0) return plan.fromUnits;
    var raw = plan.fromUnits + (plan.toUnits - plan.fromUnits) * plan.ease(t);
    var travelled = Math.abs(raw - plan.fromUnits);
    var steps = Math.floor(travelled / plan.stepUnits) * plan.stepUnits;
    var units = plan.toUnits > plan.fromUnits ? plan.fromUnits + steps : plan.fromUnits - steps;
    return plan.toUnits > plan.fromUnits
      ? Math.min(units, plan.toUnits)
      : Math.max(units, plan.toUnits);
  }

  function textFor(plan, units) {
    return plan.prefix + format(units / plan.scale, plan) + plan.suffix;
  }

  /* ---------- one counter ------------------------------------------------ */

  var SR_STYLE = 'position:absolute;width:1px;height:1px;margin:-1px;padding:0;' +
                 'overflow:hidden;clip:rect(0 0 0 0);clip-path:inset(50%);white-space:nowrap;border:0';

  var mounted = [];

  function mount(el, o, plan) {
    var c = {
      el: el,
      opts: o,
      plan: plan,
      original: el.innerHTML,
      elapsed: 0,
      sincePaint: 0,
      units: null,
      running: false,
      played: false
    };

    var visual = document.createElement('span');
    visual.className = 'sqs-counter-value';
    visual.style.fontVariantNumeric = 'tabular-nums';
    if (o.a11y !== 'off') visual.setAttribute('aria-hidden', 'true');

    el.textContent = '';
    el.appendChild(visual);
    c.visual = visual;

    // Screen readers get the finished number once, rather than whatever the
    // animation happened to be showing, and never a running commentary.
    if (o.a11y !== 'off') {
      var sr = document.createElement('span');
      sr.className = 'sqs-counter-sr';
      sr.setAttribute('style', SR_STYLE);
      sr.textContent = textFor(plan, plan.toUnits);
      el.appendChild(sr);
      c.sr = sr;
    }

    paint(c, plan.fromUnits, true);
    if (o.reserve) reserve(c);
    mounted.push(c);
    return c;
  }

  // Hold the width of the finished number from the start, so a centred stat
  // does not shuffle sideways as digits arrive.
  function reserve(c) {
    var visual = c.visual, showing = visual.textContent;
    visual.style.minWidth = '';
    visual.textContent = textFor(c.plan, c.plan.toUnits);
    var w = visual.offsetWidth;
    visual.textContent = showing;
    if (w > 0) {
      visual.style.display = 'inline-block';
      visual.style.minWidth = w + 'px';
    }
  }

  function paint(c, units, force) {
    if (!force && units === c.units) return;
    c.units = units;
    c.visual.textContent = textFor(c.plan, units);
  }

  /* ---------- the shared ticker ------------------------------------------ */

  var active = [];
  var ticking = false;
  var last = -1;

  function ensureTicking() {
    if (ticking || !active.length) return;
    ticking = true;
    last = -1;
    requestAnimationFrame(tick);
  }

  function tick(now) {
    var dt = last < 0 ? 0 : now - last;
    last = now;
    // A backgrounded tab stops firing frames. Capping the gap means it picks up
    // where it left off rather than jumping to the end on the way back.
    if (dt < 0) dt = 0;
    if (dt > 200) dt = 200;

    for (var i = active.length - 1; i >= 0; i--) {
      var c = active[i];
      c.elapsed += dt;
      c.sincePaint += dt;

      if (c.elapsed < c.plan.delay) continue;

      var t = c.plan.duration > 0 ? (c.elapsed - c.plan.delay) / c.plan.duration : 1;
      if (t >= 1) {
        paint(c, c.plan.toUnits, true);
        active.splice(i, 1);
        finish(c);
        continue;
      }
      if (c.sincePaint < c.plan.frame) continue;
      c.sincePaint = 0;
      paint(c, unitsAt(c.plan, t), false);
    }

    if (!active.length) { ticking = false; return; }
    requestAnimationFrame(tick);
  }

  function finish(c) {
    c.running = false;
    c.played = true;
    c.el.setAttribute(DONE, 'done');
  }

  function play(c) {
    if (c.running) return;
    c.elapsed = 0;
    c.sincePaint = c.plan.frame;
    paint(c, c.plan.fromUnits, true);
    c.running = true;
    c.el.setAttribute(DONE, 'running');
    if (c.plan.duration <= 0 && c.plan.delay <= 0) {
      paint(c, c.plan.toUnits, true);
      finish(c);
      return;
    }
    active.push(c);
    ensureTicking();
  }

  function halt(c) {
    var i = active.indexOf(c);
    if (i !== -1) active.splice(i, 1);
    c.running = false;
  }

  /* ---------- when it starts --------------------------------------------- */

  function reduced() {
    try {
      return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (e) { return false; }
  }

  var io = null;
  function observer() {
    if (io || typeof IntersectionObserver === 'undefined') return io;
    io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var c = entry.target._sqsCounter;
        if (!c) return;
        if (entry.isIntersecting) {
          if (c.played && c.opts.once) return;
          play(c);
          if (c.opts.once) io.unobserve(c.el);
        } else if (!c.opts.once && !c.running) {
          c.played = false;
          paint(c, c.plan.fromUnits, true);
        }
      });
    });
    return io;
  }

  function arm(c) {
    if (reduced()) {
      // No long animation when the visitor has asked for less motion. The
      // number is the content, so it still has to be there.
      paint(c, c.plan.toUnits, true);
      finish(c);
      return;
    }
    if (c.opts.trigger === 'immediate' || !observer()) { play(c); return; }
    observer().observe(c.el);
  }

  /* ---------- finding counters -------------------------------------------- */

  function init(el, overrides) {
    if (el._sqsCounter) return el._sqsCounter;
    if (el.closest && el.closest(SKIP)) { el.setAttribute(DONE, 'skipped'); return null; }

    var o = merge(applyAttrs(copy(cfg), el.dataset), overrides);

    // The element's own text is both the no-JavaScript fallback and, unless you
    // say otherwise, the target: "$6bn+" counts the 6 and keeps the rest.
    var written = parse(el.textContent, o.locale);
    if (!has(o.to)) {
      if (!written) {
        el.setAttribute(DONE, 'unparsed');
        warn('no number to count to in', el, JSON.stringify(el.textContent.trim()));
        return null;
      }
      o.to = written.literal;
    }

    var plan = buildPlan(o, written);
    if (!plan) {
      el.setAttribute(DONE, 'unparsed');
      warn('could not build a counter for', el);
      return null;
    }

    var c = mount(el, o, plan);
    el._sqsCounter = c;
    el.setAttribute(DONE, 'ready');
    arm(c);
    return c;
  }

  function scanElements(root) {
    var scope = root || document;
    if (scope.nodeType === 1 && scope.matches && scope.matches(cfg.selector)) init(scope);
    var nodes = scope.querySelectorAll ? scope.querySelectorAll(cfg.selector) : [];
    for (var i = 0; i < nodes.length; i++) init(nodes[i]);
  }

  /* ---------- {{101}} in an ordinary text block ---------------------------- */

  var MARKER = /\{\{([^{}]{1,200})\}\}/g;

  // Either "key=value", with quotes if the value has spaces in it, or a bare
  // time, which is the duration because that is what people reach for.
  var OPT = /([a-z0-9]+)\s*=\s*("[^"]*"|'[^']*'|\S+)|(?:^|\s)([\d.]+(?:ms|s))(?=\s|$)/gi;

  var OPT_KEYS = ['from', 'to', 'duration', 'speed', 'delay', 'step', 'decimals',
                  'grouping', 'locale', 'prefix', 'suffix', 'easing', 'trigger',
                  'once', 'fps', 'reserve', 'a11y', 'debug'];

  // {{101}} counts up from zero. {{100>0}} counts down. Anything after a pipe
  // sets the same options the attributes do, without the data-counter- prefix:
  // {{1,000+ | 3s delay=200ms step=50}}.
  function spec(inner) {
    var text = String(inner);
    var bar = text.indexOf('|');
    var ends = (bar === -1 ? text : text.slice(0, bar)).split('>');

    var to = parse(ends.length > 1 ? ends[1] : ends[0]);
    if (!to) return null;
    var from = ends.length > 1 ? parse(ends[0]) : null;
    if (ends.length > 1 && !from) return null;

    var attrs = {}, m;
    OPT.lastIndex = 0;
    while (bar !== -1 && (m = OPT.exec(text.slice(bar + 1))) !== null) {
      if (m[3]) { attrs['data-counter-duration'] = m[3]; continue; }
      var key = m[1].toLowerCase();
      if (OPT_KEYS.indexOf(key) === -1) {
        warn('unknown option "' + key + '" in {{' + text + '}}');
        continue;
      }
      attrs['data-counter-' + key] = m[2].replace(/^["']|["']$/g, '');
    }

    return { to: to, from: from, attrs: attrs };
  }

  function replaceMarkers(node) {
    var text = node.nodeValue;
    if (text.indexOf('{{') === -1) return false;

    var frag = document.createDocumentFragment();
    var made = [];
    var at = 0, m;

    MARKER.lastIndex = 0;
    while ((m = MARKER.exec(text)) !== null) {
      var s = spec(m[1]);
      if (!s) continue;                       // not a number, leave it as typed
      frag.appendChild(document.createTextNode(text.slice(at, m.index)));
      var span = document.createElement('span');
      span.className = 'sqs-counter';
      for (var key in s.attrs) {
        if (Object.prototype.hasOwnProperty.call(s.attrs, key)) span.setAttribute(key, s.attrs[key]);
      }
      span.setAttribute('data-counter-to', s.to.literal);
      if (s.from) span.setAttribute('data-counter-from', s.from.literal);
      span.textContent = s.to.prefix + s.to.literal + s.to.suffix;
      frag.appendChild(span);
      made.push(span);
      at = m.index + m[0].length;
    }

    if (!made.length) return false;
    frag.appendChild(document.createTextNode(text.slice(at)));
    node.parentNode.replaceChild(frag, node);
    for (var i = 0; i < made.length; i++) init(made[i]);
    return true;
  }

  function walkText(scope) {
    if (!scope.textContent || scope.textContent.indexOf('{{') === -1) return;
    var walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT, null);
    var found = [], node;
    while ((node = walker.nextNode())) {
      if (node.nodeValue.indexOf('{{') === -1) continue;
      if (node.parentNode && node.parentNode.closest && node.parentNode.closest(NO_MARKERS)) continue;
      found.push(node);
    }
    for (var i = 0; i < found.length; i++) replaceMarkers(found[i]);
  }

  function scanText(root) {
    if (!cfg.text) return;
    var scope = root || document;
    if (scope.nodeType === 1 && scope.matches && scope.matches(cfg.textScope)) walkText(scope);
    var blocks = scope.querySelectorAll ? scope.querySelectorAll(cfg.textScope) : [];
    for (var i = 0; i < blocks.length; i++) walkText(blocks[i]);
  }

  function scan(root) {
    scanText(root);
    scanElements(root);
    // An ajax page change takes counters out of the document. Forget them, or
    // a long session on a busy site holds on to every one it ever built.
    for (var i = mounted.length - 1; i >= 0; i--) {
      if (mounted[i].el.isConnected === false) { halt(mounted[i]); mounted.splice(i, 1); }
    }
  }

  /* ---------- public API --------------------------------------------------- */

  // A plan from a plain options object, filling in the site defaults for
  // anything left out. No DOM involved, which is what the tests exercise.
  function planFor(options) {
    var o = merge(copy(cfg), options);
    return buildPlan(o, has(o.to) ? parse(o.to, o.locale) : null);
  }

  // What that configuration displays at a given point through the count, 0 to 1.
  function sample(options, t) {
    var plan = planFor(options);
    return plan ? textFor(plan, unitsAt(plan, t)) : null;
  }

  function instance(el) { return el && el._sqsCounter; }

  function run(el, options) {
    if (options && instance(el)) destroy(el);   // a fresh set of numbers
    var c = instance(el) || init(el, options);
    if (!c) return null;
    halt(c);
    c.played = false;
    play(c);
    return c;
  }

  function stop(el) { var c = instance(el); if (c) halt(c); return c; }

  function reset(el) {
    var c = instance(el);
    if (!c) return null;
    halt(c);
    c.played = false;
    paint(c, c.plan.fromUnits, true);
    c.el.setAttribute(DONE, 'ready');
    return c;
  }

  function destroy(el) {
    var c = instance(el);
    if (!c) return;
    halt(c);
    var at = mounted.indexOf(c);
    if (at !== -1) mounted.splice(at, 1);
    if (io) io.unobserve(el);
    el.innerHTML = c.original;
    el.removeAttribute(DONE);
    try { delete el._sqsCounter; } catch (e) { el._sqsCounter = null; }
  }

  /* ---------- lifecycle ----------------------------------------------------- */

  // Never run inside the Squarespace editor. The editor loads the site in a
  // frame and reads the live DOM when it saves, so a script that rewrites
  // content there risks writing its own output into the saved page. The live
  // site is never framed, so this costs nothing.
  function inEditor() {
    try {
      if (window.self !== window.top) return true;
    } catch (e) {
      return true;                            // a cross-origin parent means framed
    }
    var root = document.documentElement, body = document.body;
    return /(^|\s)sqs-edit-mode/.test(root.className) ||
           !!(body && /(^|\s)sqs-edit-mode/.test(body.className));
  }

  applyAttrs(cfg, SCRIPT && SCRIPT.dataset);

  if (inEditor()) {
    // Say so out loud. Both the editor and the preview frame the site, and the
    // preview rewrites the address bar to the real page URL, so it is easy to
    // look at a static number or a raw {{101}} there and think this is broken.
    if (window.console && console.info) {
      console.info('[sqs-counter] skipped: this page is inside the Squarespace ' +
                   'editor or preview frame, where rewriting content is unsafe. ' +
                   'Counters run on the live site.');
    }
    return;
  }

  // Nothing can guarantee a marker is replaced before its own text is painted:
  // that depends on how the page arrives over the network. data-counter-hide
  // takes the certain route instead and hides the text until the markers are
  // gone, either everywhere counters can appear or in one selector you name.
  // It costs a moment of missing text, which is a better moment than one
  // showing braces.
  var hidden = null;
  function hideUntilReady() {
    if (!cfg.hide || hidden) return;
    // Pointless once the page has been parsed: whatever was going to be seen
    // has been seen.
    if (document.readyState !== 'loading') return;
    var where = cfg.hide === true || /^(true|all)$/i.test(String(cfg.hide)) ? cfg.textScope : String(cfg.hide);
    hidden = document.createElement('style');
    hidden.textContent = where + '{visibility:hidden!important}';
    (document.head || document.documentElement).appendChild(hidden);
    // If anything goes wrong before the page is ready, show the text anyway.
    setTimeout(reveal, 4000);
  }
  function reveal() {
    if (!hidden) return;
    if (hidden.parentNode) hidden.parentNode.removeChild(hidden);
    hidden = null;
  }

  hideUntilReady();
  scan();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { scan(); reveal(); });
  } else {
    reveal();
  }
  window.addEventListener('load', function () { scan(); reveal(); });

  // While the page is still parsing, markers are converted as their text
  // arrives, which is what keeps a raw {{101}} off the screen. This needs
  // characterData as well as childList: the parser usually appends characters
  // to a text node it has already inserted, so watching only for added nodes
  // sees "{{10" once and never looks again.
  function convertIfMarker(node) {
    if (!node || node.nodeType !== 3 || node.nodeValue.indexOf('{{') === -1) return;
    var parent = node.parentNode;
    if (!parent || !parent.closest) return;
    if (!parent.closest(cfg.textScope) || parent.closest(NO_MARKERS)) return;
    replaceMarkers(node);
  }

  if (document.readyState === 'loading') {
    var early = new MutationObserver(function (records) {
      for (var i = 0; i < records.length; i++) {
        if (records[i].type === 'characterData') { convertIfMarker(records[i].target); continue; }
        var nodes = records[i].addedNodes;
        for (var j = 0; j < nodes.length; j++) {
          if (nodes[j].nodeType === 3) convertIfMarker(nodes[j]);
          else if (nodes[j].nodeType === 1) scanText(nodes[j]);
        }
      }
    });
    early.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
    document.addEventListener('DOMContentLoaded', function () { early.disconnect(); });
  }

  // Squarespace also adds content after load: ajax page changes, lazy
  // sections, "load more".
  var queued = false;
  new MutationObserver(function (records) {
    var added = false;
    for (var i = 0; i < records.length; i++) {
      if (records[i].addedNodes.length) { added = true; break; }
    }
    if (!added || queued) return;
    // A timeout rather than an animation frame: this is DOM work, not
    // painting, and a backgrounded tab gets no frames at all, so a page
    // navigated behind your back would still be showing {{101}} on return.
    queued = true;
    setTimeout(function () { queued = false; scan(); }, 0);
  }).observe(document.documentElement, { childList: true, subtree: true });

  // Web fonts land after the width is measured, so measure again once.
  if (document.fonts && document.fonts.ready && document.fonts.ready.then) {
    document.fonts.ready.then(function () {
      for (var i = 0; i < mounted.length; i++) {
        if (mounted[i].opts.reserve && mounted[i].el.isConnected) reserve(mounted[i]);
      }
    });
  }

  window.sqsCounter = {
    scan: scan,
    run: run,
    stop: stop,
    reset: reset,
    destroy: destroy,
    parse: parse,
    marker: spec,
    reveal: reveal,
    format: format,
    plan: planFor,
    sample: sample,
    config: cfg
  };
})();

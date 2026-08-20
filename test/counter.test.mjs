import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load } from './load.mjs';

const { sqsCounter } = load('counter/sqs-counter.js');
const at = (opts, t) => sqsCounter.sample(opts, t);
const end = (opts) => sqsCounter.sample(opts, 1);

/* ---------- reading the number you wrote ---------------------------- */

test('reads a plain integer', () => {
  const n = sqsCounter.parse('101');
  assert.equal(n.value, 101);
  assert.equal(n.decimals, 0);
  assert.equal(n.grouping, false);
});

test('a separator in the literal means grouping', () => {
  const n = sqsCounter.parse('1,000');
  assert.equal(n.value, 1000);
  assert.equal(n.grouping, true);
});

test('a space is a separator too', () => {
  assert.equal(sqsCounter.parse('1 000 000').value, 1000000);
  assert.equal(sqsCounter.parse('1 000 000').grouping, true);
});

test('decimals come from how many you wrote', () => {
  assert.equal(sqsCounter.parse('12.5').decimals, 1);
  assert.equal(sqsCounter.parse('12.50').decimals, 2);
  assert.equal(sqsCounter.parse('12').decimals, 0);
});

test('splits prefix and suffix off the number', () => {
  const n = sqsCounter.parse('$6bn+');
  assert.equal(n.prefix, '$');
  assert.equal(n.value, 6);
  assert.equal(n.suffix, 'bn+');
});

test('a trailing separator belongs to the suffix', () => {
  const n = sqsCounter.parse('1,000+');
  assert.equal(n.value, 1000);
  assert.equal(n.suffix, '+');
});

test('negative values', () => {
  assert.equal(sqsCounter.parse('-40').value, -40);
  assert.equal(sqsCounter.parse('-12.5').value, -12.5);
});

test('rejects text with no number in it', () => {
  assert.equal(sqsCounter.parse('none'), null);
  assert.equal(sqsCounter.parse(''), null);
  assert.equal(sqsCounter.parse(null), null);
  assert.equal(sqsCounter.parse('   '), null);
});

test('reads a German literal against a German locale', () => {
  const n = sqsCounter.parse('1.234.567', 'de-DE');
  assert.equal(n.value, 1234567);
  assert.equal(n.grouping, true);
  assert.equal(sqsCounter.parse('12,5', 'de-DE').value, 12.5);
});

test('one dot in en-GB is still a decimal point', () => {
  assert.equal(sqsCounter.parse('1.234').value, 1.234);
});

/* ---------- the count itself ---------------------------------------- */

test('starts at zero and ends exactly on the target', () => {
  assert.equal(at({ to: '101' }, 0), '0');
  assert.equal(end({ to: '101' }), '101');
});

test('never shows a value past the target', () => {
  for (let t = 0; t <= 1; t += 0.01) {
    const shown = Number(at({ to: '101' }, t));
    assert.ok(shown >= 0 && shown <= 101, `${shown} at t=${t}`);
  }
});

test('counts down when the start is higher', () => {
  const opts = { from: '100', to: '0' };
  assert.equal(at(opts, 0), '100');
  assert.equal(end(opts), '0');
  assert.equal(Number(at(opts, 0.5)) < 100, true);
});

test('start equal to end just shows the value', () => {
  assert.equal(end({ from: '50', to: '50' }), '50');
  assert.equal(sqsCounter.plan({ from: '50', to: '50' }).duration, 0);
});

test('grouping follows the literal, and can be forced', () => {
  assert.equal(end({ to: '1,000' }), '1,000');
  assert.equal(end({ to: '1000' }), '1000');
  assert.equal(end({ to: '1000', grouping: true }), '1,000');
  assert.equal(end({ to: '1,000', grouping: false }), '1000');
});

test('decimals follow the literal, and can be forced', () => {
  assert.equal(end({ to: '12.5' }), '12.5');
  assert.equal(end({ to: '12.5', decimals: 2 }), '12.50');
  assert.equal(end({ to: '12.5', decimals: 0 }), '13');
  assert.equal(at({ to: '12.5' }, 0), '0.0');
});

test('no floating point artefacts on the way', () => {
  for (let t = 0; t <= 1; t += 0.005) {
    const shown = at({ to: '0.3', from: '0.1' }, t);
    assert.match(shown, /^0\.\d$/, shown);
  }
});

test('a decimal step lands on its multiples', () => {
  const seen = new Set();
  for (let t = 0; t <= 1; t += 0.001) seen.add(at({ to: '12.5', step: 0.5 }, t));
  for (const shown of seen) {
    assert.equal((Number(shown) * 10) % 5, 0, shown);
  }
});

test('a step that does not divide the range still finishes on it', () => {
  const opts = { to: '95', step: 10 };
  assert.equal(end(opts), '95');
  const shown = new Set();
  for (let t = 0; t < 1; t += 0.001) shown.add(at(opts, t));
  for (const v of shown) assert.equal(Number(v) % 10, 0, v);
});

test('a step works the same counting down', () => {
  const opts = { from: '100', to: '5', step: 10 };
  assert.equal(end(opts), '5');
  for (let t = 0; t < 1; t += 0.01) {
    const v = Number(at(opts, t));
    assert.equal(v % 10, 0, String(v));
    assert.ok(v >= 5 && v <= 100);
  }
});

test('prefix and suffix are carried through every frame', () => {
  const opts = { to: '$6bn+' };
  assert.equal(at(opts, 0), '$0bn+');
  assert.equal(end(opts), '$6bn+');
  assert.equal(end({ to: '6', prefix: '£', suffix: 'm' }), '£6m');
});

test('formats to the locale it is given', () => {
  assert.equal(end({ to: '1,234.5', locale: 'en-GB' }), '1,234.5');
  // Under a German locale you write the number the German way, and get it back.
  assert.equal(end({ to: '1.234,5', locale: 'de-DE' }), '1.234,5');
});

test('a literal that the locale cannot read is refused, not guessed at', () => {
  assert.equal(sqsCounter.plan({ to: '1,234.5', locale: 'de-DE' }), null);
});

test('a billion counts and lands exactly', () => {
  const opts = { to: '1,000,000,000', step: 10000000 };
  assert.equal(end(opts), '1,000,000,000');
  assert.equal(at(opts, 0), '0');
  assert.ok(Number(at(opts, 0.5).replace(/,/g, '')) % 10000000 === 0);
});

/* ---------- duration, speed, easing --------------------------------- */

test('duration is the whole count, whatever the range', () => {
  assert.equal(sqsCounter.plan({ to: '100' }).duration, 2000);
  assert.equal(sqsCounter.plan({ to: '200' }).duration, 2000);
  assert.equal(sqsCounter.plan({ to: '100', duration: 3500 }).duration, 3500);
});

test('speed makes a bigger range take longer', () => {
  assert.equal(sqsCounter.plan({ to: '100', speed: 50 }).duration, 2000);
  assert.equal(sqsCounter.plan({ to: '200', speed: 50 }).duration, 4000);
});

test('durations accept seconds and milliseconds', () => {
  assert.equal(sqsCounter.plan({ to: '10', duration: 2000 }).duration, 2000);
  const script = load('counter/sqs-counter.js', { scriptAttrs: { counterDuration: '2.5s' } });
  assert.equal(script.sqsCounter.config.duration, 2500);
  const ms = load('counter/sqs-counter.js', { scriptAttrs: { counterDuration: '900ms' } });
  assert.equal(ms.sqsCounter.config.duration, 900);
});

test('easing changes the middle but never the ends', () => {
  for (const easing of ['linear', 'out', 'in-out']) {
    assert.equal(at({ to: '100', easing }, 0), '0');
    assert.equal(at({ to: '100', easing }, 1), '100');
  }
  assert.equal(at({ to: '100', easing: 'linear' }, 0.5), '50');
  assert.ok(Number(at({ to: '100', easing: 'out' }, 0.5)) > 50);
});

test('a runaway duration is capped', () => {
  assert.equal(sqsCounter.plan({ to: '1000000', speed: 1 }).duration, 120000);
});

/* ---------- bad input ------------------------------------------------ */

test('invalid values give no counter rather than NaN', () => {
  assert.equal(sqsCounter.plan({ to: 'lots' }), null);
  assert.equal(sqsCounter.plan({ to: '' }), null);
  assert.equal(sqsCounter.plan({ to: '10', from: 'x' }), null);
  assert.equal(at({ to: 'lots' }, 0.5), null);
});

test('nothing ever renders NaN or undefined', () => {
  const cases = [{ to: '101' }, { to: '0' }, { to: '-40' }, { to: '12.5', step: 0.5 },
                 { from: '100', to: '0' }, { to: '1,000,000' }];
  for (const c of cases) {
    for (let t = 0; t <= 1; t += 0.05) {
      const shown = at(c, t);
      assert.ok(shown && !/NaN|undefined/.test(shown), `${JSON.stringify(c)} -> ${shown}`);
    }
  }
});

/* ---------- script tag defaults -------------------------------------- */

test('the script tag sets the default for the whole site', () => {
  const s = load('counter/sqs-counter.js', {
    scriptAttrs: { counterDuration: '4s', counterEasing: 'linear', counterTrigger: 'immediate', counterFps: '12' }
  });
  assert.equal(s.sqsCounter.config.duration, 4000);
  assert.equal(s.sqsCounter.config.easing, 'linear');
  assert.equal(s.sqsCounter.config.trigger, 'immediate');
  assert.equal(s.sqsCounter.config.fps, 12);
  assert.equal(s.sqsCounter.sample({ to: '100' }, 0.5), '50');
});

test('the locale comes from the Squarespace site settings', () => {
  const s = load('counter/sqs-counter.js', { context: { website: { language: 'de-DE' } } });
  assert.equal(s.sqsCounter.config.locale, 'de-DE');
  assert.equal(s.sqsCounter.sample({ to: '1.234' }, 1), '1.234');
});

test('a bad step or speed is ignored, not obeyed', () => {
  assert.equal(sqsCounter.plan({ to: '100', step: 0 }).stepUnits, 1);
  const s = load('counter/sqs-counter.js', { scriptAttrs: { counterStep: '-5', counterSpeed: 'fast' } });
  assert.equal(s.sqsCounter.config.step, null);
  assert.equal(s.sqsCounter.config.speed, null);
});

test('a duration passed to the API beats a speed set on the tag', () => {
  assert.equal(sqsCounter.plan({ to: '200', speed: 50 }).duration, 4000);
  assert.equal(sqsCounter.plan({ to: '200', speed: 50, duration: 1000 }).duration, 1000);
});

/* ---------- {{ }} markers -------------------------------------------- */

const mark = (s) => sqsCounter.marker(s);

test('a plain marker counts up from zero', () => {
  const m = mark('101');
  assert.equal(m.to.value, 101);
  assert.equal(m.from, null);
  assert.deepEqual(Object.keys(m.attrs), []);
});

test('a marker keeps how the number was written', () => {
  assert.equal(mark('1,000+').to.grouping, true);
  assert.equal(mark('1,000+').to.suffix, '+');
  assert.equal(mark('$6bn+').to.prefix, '$');
  assert.equal(mark('12.5').to.decimals, 1);
});

test('an arrow in a marker counts down', () => {
  const m = mark('100>0');
  assert.equal(m.from.value, 100);
  assert.equal(m.to.value, 0);
});

test('a bare time after the pipe is the duration', () => {
  assert.equal(mark('101 | 3s').attrs['data-counter-duration'], '3s');
  assert.equal(mark('101 | 1500ms').attrs['data-counter-duration'], '1500ms');
});

test('options after the pipe use the attribute names', () => {
  const m = mark('1,000,000,000 | 4s step=10000000 delay=200ms easing=linear');
  assert.equal(m.attrs['data-counter-duration'], '4s');
  assert.equal(m.attrs['data-counter-step'], '10000000');
  assert.equal(m.attrs['data-counter-delay'], '200ms');
  assert.equal(m.attrs['data-counter-easing'], 'linear');
  assert.equal(m.to.value, 1000000000);
});

test('a quoted option value may contain spaces', () => {
  assert.equal(mark('1,000 | suffix=" per year"').attrs['data-counter-suffix'], ' per year');
});

test('an unknown option is dropped, not obeyed', () => {
  assert.deepEqual(Object.keys(mark('101 | colour=red').attrs), []);
});

test('a marker with no number in it is left as typed', () => {
  assert.equal(mark('hello'), null);
  assert.equal(mark(''), null);
  assert.equal(mark('a>101'), null);
});

/* ---------- hiding the text until the markers are gone ---------------- */

const styles = (s) => s.__head.children.filter((el) => el.tagName === 'STYLE').map((el) => el.textContent);

test('nothing is hidden unless you ask', () => {
  const s = load('counter/sqs-counter.js', { readyState: 'loading' });
  assert.deepEqual(styles(s), []);
});

test('hide="true" hides everywhere a marker can appear', () => {
  const s = load('counter/sqs-counter.js', { readyState: 'loading', scriptAttrs: { counterHide: 'true' } });
  assert.deepEqual(styles(s),
    ['.sqs-block-html, .sqs-block-markdown, .sqs-block-code, [data-counter-scan]{visibility:hidden!important}']);
});

test('hide can name one selector instead', () => {
  const s = load('counter/sqs-counter.js', { readyState: 'loading', scriptAttrs: { counterHide: '#stats' } });
  assert.deepEqual(styles(s), ['#stats{visibility:hidden!important}']);
});

test('the text comes back when the page is ready', () => {
  const s = load('counter/sqs-counter.js', { readyState: 'loading', scriptAttrs: { counterHide: 'true' } });
  assert.equal(styles(s).length, 1);
  s.__fire('DOMContentLoaded');
  assert.deepEqual(styles(s), []);
});

test('the text comes back even if the page never gets ready', () => {
  const s = load('counter/sqs-counter.js', { readyState: 'loading', scriptAttrs: { counterHide: 'true' } });
  const fallback = s.__timers.find(([, ms]) => ms === 4000);
  assert.ok(fallback, 'a fallback timer is set');
  fallback[0]();
  assert.deepEqual(styles(s), []);
});

test('a script that loads after the parse hides nothing', () => {
  const s = load('counter/sqs-counter.js', { scriptAttrs: { counterHide: 'true' } });
  assert.deepEqual(styles(s), []);   // the braces are already on screen by then
});

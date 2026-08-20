// The counter must not disturb the tool people are already using. These pin
// the behaviour of sqs-dates so a change to the repo cannot quietly alter it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load } from './load.mjs';

const { sqsDates } = load('dates/sqs-dates.js');

// The parsed object comes from the sandbox realm, so compare it field by field.
const ymd = (s) => { const p = sqsDates.parse(s); return p && [p.y, p.m, p.d]; };

test('dates still parses the three shapes Squarespace renders', () => {
  assert.deepEqual(ymd('2024-06-18'), [2024, 6, 18]);
  assert.deepEqual(ymd('18 June 2024'), [2024, 6, 18]);
  assert.deepEqual(ymd('18/06/2024'), [2024, 6, 18]);
});

test('dates still formats day.js style tokens', () => {
  const parts = sqsDates.parse('2024-06-18');
  assert.equal(sqsDates.format(parts, 'D MMMM YYYY'), '18 June 2024');
  assert.equal(sqsDates.format(parts, 'ddd D MMM YY'), 'Tue 18 Jun 24');
  assert.equal(sqsDates.format(parts, 'Do [of] MMMM'), '18th of June');
});

test('dates still refuses to guess', () => {
  assert.equal(sqsDates.parse('sometime'), null);
  assert.equal(sqsDates.parse(''), null);
});

test('dates defaults are unchanged', () => {
  assert.equal(sqsDates.config.format, 'D MMMM YYYY');
  assert.equal(sqsDates.config.locale, 'en-GB');
});

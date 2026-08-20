// Neither tool may touch a page the Squarespace editor is showing: the editor
// reads the live DOM when it saves, so anything a script rewrites there can be
// written into the page for good. These pin every way of noticing it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load } from './load.mjs';

const guarded = [
  ['counter', 'counter/sqs-counter.js', 'sqsCounter'],
  ['dates', 'dates/sqs-dates.js', 'sqsDates']
];

for (const [name, file, global] of guarded) {
  test(`${name} runs on an ordinary page`, () => {
    assert.equal(typeof load(file)[global], 'object');
  });

  test(`${name} does nothing when it is framed`, () => {
    assert.equal(load(file, { framed: true })[global], undefined);
  });

  test(`${name} does nothing when the parent is on another origin`, () => {
    assert.equal(load(file, { crossOriginTop: true })[global], undefined);
  });

  test(`${name} does nothing in edit mode on the html element`, () => {
    assert.equal(load(file, { htmlClass: 'sqs-edit-mode-active' })[global], undefined);
  });

  test(`${name} does nothing in edit mode on the body`, () => {
    assert.equal(load(file, { bodyClass: 'sqs-edit-mode' })[global], undefined);
  });

  test(`${name} is not fooled by a class that merely starts the same`, () => {
    assert.equal(typeof load(file, { htmlClass: 'not-sqs-edit-mode' })[global], 'object');
  });
}

// Every tool must be able to take itself back out. See
// docs/squarespace-editor.md.
for (const [name, file, global] of guarded) {
  test(`${name} exposes a shutdown`, () => {
    assert.equal(typeof load(file)[global].shutdown, 'function');
  });

  test(`${name} can be shut down twice without complaint`, () => {
    const api = load(file)[global];
    api.shutdown();
    api.shutdown();
    api.scan();          // and does nothing afterwards
  });
}

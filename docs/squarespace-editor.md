# The Squarespace editor rule

**Every tool in this repo must be able to remove itself from a page completely,
at any moment, and must do so the instant the editor appears.**

This is the one rule that matters most here, because breaking it damages a
client's content rather than just looking wrong. Read it before adding a tool,
and before changing how an existing one writes to the DOM.

## Why

The Squarespace editor loads the site in a frame and **reads the live DOM when
it saves**. Anything a script has changed by then is a candidate for being
written into the page for good:

- Rewritten text is saved as the new content. `18/06/2024` becomes
  `18 June 2024` permanently, and the real date is gone.
- Injected elements are saved as markup. A typed `{{101}}` becomes a
  `<span class="sqs-counter">`, and the marker that produced it is gone.
- Marker attributes are saved too. `data-sqs-dates="done"` on a client's
  element, forever.
- A script still mutating the DOM while the editor renders can make the editor
  draw a section twice. Intermittent, alarming, and fine again after a reload,
  which is what makes it easy to blame on Squarespace.

None of this shows up in testing on the live site. It only happens to whoever
is editing, which is usually the client.

## The rule, in five parts

**1. Guard at load.** Do nothing at all if the document is framed, or if `html`
or `body` carries an `sqs-edit-mode` class. Not a partial run, nothing: no
writes, no marker attributes, not even the debugging global.

```js
function inEditor() {
  try {
    if (window.self !== window.top) return true;
  } catch (e) {
    return true;                    // a cross-origin parent means framed
  }
  return editing();
}

function editing() {
  var root = document.documentElement, body = document.body;
  return EDIT.test(root.className) || !!(body && EDIT.test(body.className));
}
```

The frame check costs nothing, because the live site is never framed.

**2. Watch for the editor arriving.** The guard above only sees the page it
loaded into. Squarespace can start the editor up in a document that is already
running, and then a script that passed the guard is still writing while the
editor renders. Watch `html` and `body` for the class:

```js
var watcher = new MutationObserver(function () { if (editing()) shutdown(); });
watcher.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
```

**3. Record every write as you make it.** A tool that cannot say what it
changed cannot undo it. Before writing, keep whatever is needed to reverse it
exactly:

| What you change | What to keep |
| --- | --- |
| An element's text | its `innerHTML`, not its text, so child elements survive |
| An attribute | whether it existed, and its old value |
| A node you replaced | the node, or the exact text it stood in for |
| A marker attribute | nothing, but remove it from every element on shutdown |
| An injected `<style>` | the element, to remove it |

**4. Undo to the source form, not the rendered form.** A counter built from
`{{101}}` goes back to the text `{{101}}`, not to the span it became. Restoring
the wrong one is still corruption, just tidier corruption. Merge text nodes
back with `parent.normalize()` so the DOM is genuinely identical.

**5. Shut down completely and say so.** Disconnect every observer, cancel every
animation, remove every injected element, restore every recorded write, strip
the marker attribute from everything that carries it, and log one line saying
what happened and that a reload brings the tool back.

## How it is tested

Two layers, both required for a new tool.

`test/editor-guard.test.mjs` covers the load-time guard for every tool, on
every path: framed, cross-origin parent, edit class on `html`, edit class on
`body`, and a class that merely starts the same (`not-sqs-edit-mode` must not
match). Add your tool to the list at the top of that file and it is covered.

The undo needs a real DOM, so each tool has a page that triggers edit mode and
then **compares the live DOM against the server's own response for that page**,
rather than against a snapshot the page took of itself:

```text
dates/test-editor.html      press the button, expect "clean"
counter/demo.html           the "Start the editor in this page" button
```

Both currently report the page identical to what was served, with zero traces
left. Anything less than identical is a bug, not a rounding error.

## Adding a tool

1. Copy `inEditor()` and `editing()` verbatim. Do not reimplement them.
2. Return early on `inEditor()`, before anything else runs, including any
   config that writes to the page.
3. Keep an `undo` list, a `watchers` list, and a `stopped` flag.
4. Push every observer you create onto `watchers`.
5. Make your scan function a no-op when `stopped`.
6. Write `shutdown()` and wire it to `watchForEditor()`.
7. Add the tool to `test/editor-guard.test.mjs`.
8. Add a page that diffs against the server response, and check it says clean.

## What this does not cover

If Squarespace saves in the same moment the editor's class lands, before the
observer callback runs, the ordering is not ours to control. The class arrives
as the editor starts, well before anyone can click save, so the window is
theoretical rather than practical, but it is not zero.

Nothing here protects a page that was already saved while an older build was
running. Those changes are in the content. Check the block source.

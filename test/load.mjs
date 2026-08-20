// Loads a tool into a throwaway sandbox so its pure parts can be tested in
// Node, with no browser and no dependencies. Only what the script touches at
// load time is stubbed: enough DOM to get past the editor guard and the first
// empty scan.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';

const here = dirname(fileURLToPath(import.meta.url));

export function load(file, options = {}) {
  const listeners = {};
  const timers = [];
  const head = { children: [], appendChild(el) { el.parentNode = head; head.children.push(el); return el; },
                 removeChild(el) { head.children = head.children.filter((c) => c !== el); return el; } };
  const sandbox = {
    console,
    setTimeout: (fn, ms) => { timers.push([fn, ms]); return timers.length; },
    requestAnimationFrame: () => 0,
    cancelAnimationFrame: () => {},
    MutationObserver: class { observe() {} disconnect() {} },
    addEventListener: (type, fn) => { (listeners[type] ||= []).push(fn); },
    matchMedia: () => ({ matches: false }),
    Static: options.context ? { SQUARESPACE_CONTEXT: options.context } : undefined,
    document: {
      currentScript: options.scriptAttrs ? { dataset: options.scriptAttrs } : null,
      documentElement: { lang: options.lang || 'en-GB', className: options.htmlClass || '' },
      body: { className: options.bodyClass || '' },
      readyState: options.readyState || 'complete',
      head,
      querySelectorAll: () => [],
      createElement: (tag) => ({ tagName: tag.toUpperCase(), textContent: '', parentNode: null }),
      addEventListener: (type, fn) => { (listeners[type] ||= []).push(fn); }
    }
  };
  sandbox.window = sandbox;
  sandbox.self = sandbox;
  if (options.crossOriginTop) {
    // A parent on another origin throws when you touch it, which is itself the
    // answer: this document is framed by something.
    Object.defineProperty(sandbox, 'top', { get() { throw new Error('cross-origin'); } });
  } else {
    sandbox.top = options.framed ? {} : sandbox;
  }

  vm.createContext(sandbox);
  vm.runInContext(readFileSync(join(here, '..', file), 'utf8'), sandbox, { filename: file });

  // Let a test drive the page lifecycle and see what was put in the head.
  sandbox.__fire = (type) => (listeners[type] || []).forEach((fn) => fn());
  sandbox.__head = head;
  sandbox.__timers = timers;
  return sandbox;
}

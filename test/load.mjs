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
  const sandbox = {
    console,
    setTimeout,
    requestAnimationFrame: () => 0,
    cancelAnimationFrame: () => {},
    MutationObserver: class { observe() {} disconnect() {} },
    addEventListener: (type, fn) => { (listeners[type] ||= []).push(fn); },
    matchMedia: () => ({ matches: false }),
    Static: options.context ? { SQUARESPACE_CONTEXT: options.context } : undefined,
    document: {
      currentScript: options.scriptAttrs ? { dataset: options.scriptAttrs } : null,
      documentElement: { lang: options.lang || 'en-GB', className: '' },
      body: { className: '' },
      readyState: 'complete',
      querySelectorAll: () => [],
      addEventListener: () => {}
    }
  };
  sandbox.window = sandbox;
  sandbox.self = sandbox;
  sandbox.top = sandbox;

  vm.createContext(sandbox);
  vm.runInContext(readFileSync(join(here, '..', file), 'utf8'), sandbox, { filename: file });
  return sandbox;
}

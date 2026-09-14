import { readFile, stat } from 'node:fs/promises';
import vm from 'node:vm';

const root = new URL('../', import.meta.url);
const read = (relative) => readFile(new URL(relative, root), 'utf8');

const index = await read('index.html');
const bundleLink = '<link rel="stylesheet" href="/styles/home.bundle.min.css?v=1">';

if ((index.split(bundleLink).length - 1) !== 1) {
  throw new Error('index.html must load the minified home bundle exactly once');
}
if (/\/styles\/(?:base|home)\.css\?v=/.test(index)) {
  throw new Error('index.html must not load the unbundled homepage styles');
}

const bundleUrl = new URL('styles/home.bundle.min.css', root);
const bundle = await read('styles/home.bundle.min.css');
const bundleSize = (await stat(bundleUrl)).size;

if (bundleSize > 45000) throw new Error(`home CSS bundle is too large: ${bundleSize} bytes`);
if (bundle.includes('/*')) throw new Error('home CSS bundle still contains comments');
for (const contract of ['--plate-base:', 'body::after', '.home-meta']) {
  if (!bundle.includes(contract)) throw new Error(`home CSS bundle lost ${contract}`);
}

const reveal = await read('scripts/reveal.js');
const firstRectRead = reveal.indexOf('getBoundingClientRect()');
const firstAttributeWrite = reveal.indexOf("setAttribute('data-rev'");
const firstStyleWrite = reveal.indexOf("style.setProperty('--d'");

if (firstRectRead === -1 || firstRectRead > firstAttributeWrite || firstRectRead > firstStyleWrite) {
  throw new Error('reveal.js must measure the first viewport before invalidating styles');
}

const analytics = await read('scripts/google-analytics.js');
const appended = [];
const listeners = new Map();
const frames = [];
const priorityImage = {
  complete: true,
  decode: () => Promise.resolve(),
  addEventListener() {},
};
const documentMock = {
  head: { appendChild: (node) => appended.push(node) },
  createElement: () => ({}),
  addEventListener: (type, handler) => listeners.set(`document:${type}`, handler),
  querySelector: (selector) => selector === 'img[fetchpriority="high"]' ? priorityImage : null,
};
const windowMock = {
  dataLayer: [],
  addEventListener: (type, handler) => listeners.set(`window:${type}`, handler),
  requestAnimationFrame: (handler) => frames.push(handler),
  setTimeout: () => 1,
};

vm.runInNewContext(analytics, {
  document: documentMock,
  window: windowMock,
  requestAnimationFrame: windowMock.requestAnimationFrame,
  setTimeout: windowMock.setTimeout,
});

if (appended.length) throw new Error('Google Analytics loads before the critical image can paint');
listeners.get('window:load')?.();
await Promise.resolve();
await Promise.resolve();
frames.shift()?.();
frames.shift()?.();
if (appended.length !== 1) throw new Error('Google Analytics did not load after the critical image paint');

console.log(`PageSpeed contracts passed; homepage CSS bundle is ${bundleSize} bytes.`);

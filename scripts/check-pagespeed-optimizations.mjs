import { readFile, stat } from 'node:fs/promises';
import vm from 'node:vm';

const root = new URL('../', import.meta.url);
const read = (relative) => readFile(new URL(relative, root), 'utf8');

const index = await read('index.html');
const bundleLink = '<link rel="stylesheet" href="/styles/home.bundle.min.css?v=2">';

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
if (!bundle.includes('--grain-img:url("/img/grain.webp")')) {
  throw new Error('homepage bundle must use the approved WebP grain');
}

const grainSize = (await stat(new URL('img/grain.webp', root))).size;
if (grainSize > 12000) throw new Error(`WebP grain is too large: ${grainSize} bytes`);

const reveal = await read('scripts/reveal.js');
if (reveal.includes('getBoundingClientRect()')) {
  throw new Error('reveal.js must not synchronously measure layout');
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

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
const read = p => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const attrs = s => Object.fromEntries([...s.matchAll(/([\w-]+)="([^"]*)"/g)].map(m => [m[1], m[2]]));
const hasClass = (a, c) => (a.class || '').split(/\s+/).includes(c);
for (const prefix of ['', 'ua/']) test(`AC1: ${prefix || 'en/'} home is one persistent collage with project links and compact previews`, () => {
  const html = read(`${prefix}index.html`);
  assert.equal([...html.matchAll(/class="home-collage"/g)].length, 1);
  assert.doesNotMatch(html, /class="slide(?:\s|" )|class="slide"/);
  const links = [...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)].map(m => ({ a: attrs(m[1]), body: m[2] }));
  const tiles = links.filter(t => hasClass(t.a, 'collage-tile'));
  const projects = new Set(links.filter(t => hasClass(t.a, 'row')).map(t => t.a.href));
  assert.equal(tiles.length, 18, 'adaptive collage has eighteen total tiles');
  assert.equal(tiles.filter(t => t.body.includes('src="/media/photo/')).length, 15, 'fifteen genuine photographs');
  assert.ok(tiles.every(t => !t.body.includes('/video/thumbs/yt')), 'no YouTube thumbnails in collage');
  for (const tile of tiles.slice(12, 14)) {
    const image = attrs(tile.body.match(/<img\b([^>]*)>/)[1]);
    assert.ok(image.src.startsWith('/media/photo/'), 'new lower frames are genuine photos');
    assert.ok(Number(image.width) / Number(image.height) >= 1.3, 'new lower photos are horizontal');
  }
  for (const { a, body } of tiles) {
    assert.ok(projects.has(a.href), `${a.href} belongs to the selected projects`);
    assert.equal(a.tabindex, '-1', 'decorative duplicate links are excluded from tab order');
    assert.match(body, /<img\b/, 'each tile retains a poster/photo fallback');
    for (const m of body.matchAll(/<img\b([^>]*)>/g)) {
      const image = attrs(m[1]);
      assert.ok(Number(image.width) > 0 && Number(image.height) > 0);
      assert.ok(statSync(new URL(`..${image.src}`, import.meta.url)).isFile(), image.src);
    }
  }
  const previews = [...html.matchAll(/data-preview="([^"]+)"/g)].map(m => m[1]);
  assert.equal(previews.length, 3, 'three compact preview films');
  for (const src of previews) {
    assert.match(src, /^\/media\/video\/previews\/.+-loop\.mp4$/);
    assert.ok(statSync(new URL(`..${src}`, import.meta.url)).size < 8 * 1024 * 1024, 'full-length compressed loop remains below 8 MiB');
  }
  assert.doesNotMatch(html, /<video[^>]*\bsrc=/, 'mobile receives no video requests from HTML');
  assert.match(html, /<button\b[^>]*id="collage-motion-toggle"/, 'keyboard accessible motion toggle');
});
test('AC2: home runtime removes slideshow switching', () => {
  const js = read('scripts/site.js');
  const block = js.slice(js.indexOf('/* ---------- Home: index + stage'), js.indexOf('/* ---------- Editorial photo galleries'));
  assert.ok(block.length > 100);
  assert.doesNotMatch(block, /querySelectorAll\(['"]\.slide/);
  assert.match(block, /61rem/, 'same desktop breakpoint as layout');
});

// Exercise public media/DOM events, independent of implementation functions.
import vm from 'node:vm';
class Element extends EventTarget {
  constructor() { super(); this.attrs = new Map(); this.children = []; this.dataset = {}; this.classList = { add() {}, remove() {}, toggle() {} }; }
  setAttribute(k, v) { this.attrs.set(k, String(v)); }
  getAttribute(k) { return this.attrs.get(k) ?? null; }
  removeAttribute(k) { this.attrs.delete(k); }
  appendChild(v) { this.children.push(v); v.parent = this; }
  remove() { this.parent.children = this.parent.children.filter(v => v !== this); }
  emit(type) { this.dispatchEvent(new Event(type)); }
  querySelectorAll(selector) { return this.children.filter(v => selector.includes('video') && v.className === 'stage-preview'); }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
}
function setup({ desktop = true, reduced = false, saveData = false, expanded = true } = {}) {
  const stage = new Element(), button = new Element(), doc = new Element();
  const hosts = [new Element(), new Element(), new Element()];
  hosts.forEach((h, i) => { h.setAttribute('data-preview', `/media/video/previews/${i}.mp4`); h.dataset.preview = h.getAttribute('data-preview'); });
  hosts[2].setAttribute('data-preview-min-width', '80rem');
  hosts[2].dataset.previewMinWidth = '80rem';
  const videos = () => hosts.flatMap(h => h.children);
  stage.querySelectorAll = s => s.includes('data-preview') ? hosts : s.includes('video') ? videos() : [];
  doc.hidden = false; doc.body = new Element();
  doc.documentElement = { lang: 'en' };
  doc.getElementById = id => id === 'stage' ? stage : id === 'collage-motion-toggle' ? button : null;
  doc.querySelector = s => s.includes('collage-motion') ? button : null;
  doc.querySelectorAll = () => [];
  doc.createElement = tag => {
    assert.equal(tag, 'video');
    const v = new Element(); v.paused = true;
    Object.defineProperty(v, 'src', { get() { return this.getAttribute('src'); }, set(value) { this.setAttribute('src', value); } });
    v.play = () => { v.paused = false; v.emit('playing'); return Promise.resolve(); };
    v.pause = () => { v.paused = true; };
    v.load = () => {};
    return v;
  };
  const expandedMQ = new Element(); expandedMQ.matches = expanded;
  const desktopMQ = new Element(), reducedMQ = new Element(), connection = new Element();
  desktopMQ.matches = desktop; reducedMQ.matches = reduced; connection.saveData = saveData;
  const matchMedia = q => q.includes('61rem') ? desktopMQ : q.includes('80rem') ? expandedMQ : q.includes('reduced-motion') ? reducedMQ : { matches: true };
  const js = read('scripts/site.js');
  const code = js.slice(js.indexOf('/* ---------- Home: index + stage'), js.indexOf('/* ---------- Editorial photo galleries'));
  const win = new Element(); win.matchMedia = matchMedia; win.innerWidth = 1400; win.innerHeight = 900;
  vm.runInNewContext(code, { document: doc, window: win, navigator: { connection }, matchMedia, setTimeout: fn => { fn(); return 1; }, clearTimeout() {} });
  return { videos, button, expanded(value) { expandedMQ.matches = value; expandedMQ.emit('change'); }, hidden(value) { doc.hidden = value; doc.emit('visibilitychange'); }, desktop(value) { desktopMQ.matches = value; desktopMQ.emit('change'); } };
}
test('AC3: all previews autoplay immediately, silently, inline and looping on desktop', () => {
  const p = setup(); assert.equal(p.videos().length, 3);
  for (const v of p.videos()) {
    assert.equal(v.muted, true); assert.equal(v.loop, true); assert.equal(v.playsInline, true);
    assert.equal(v.paused, false);
  }
});
for (const option of [{ desktop: false }, { reduced: true }, { saveData: true }]) test(`AC3: no preview requests for ${JSON.stringify(option)}`, () => {
  assert.equal(setup(option).videos().length, 0);
});
test('AC4: tab hiding pauses, explicit user pause survives visibility, desktop exit unloads', () => {
  const p = setup();
  p.hidden(true); assert.ok(p.videos().every(v => v.paused));
  p.hidden(false); assert.equal(p.videos().length, 3); assert.ok(p.videos().every(v => !v.paused));
  p.button.emit('click'); assert.equal(p.button.getAttribute('aria-pressed'), 'true');
  p.hidden(true); p.hidden(false); assert.ok(p.videos().every(v => v.paused));
  p.button.emit('click'); assert.equal(p.button.getAttribute('aria-pressed'), 'false');
  assert.ok(p.videos().every(v => !v.paused));
  const mounted = p.videos(); p.desktop(false);
  assert.equal(p.videos().length, 0);
  assert.ok(mounted.every(v => v.paused && !v.getAttribute('src')));
  p.desktop(true); assert.equal(p.videos().length, 3);
});

test('AC6: floating previews are removed; gray project text retains hover/focus affordances', () => {
  for (const path of ['index.html', 'ua/index.html', 'scripts/site.js', 'styles/site.css']) {
    assert.doesNotMatch(read(path), /project-hover-preview|data-hover-image/, path);
  }
  const css = read('styles/site.css');
  assert.match(css, /\.index \.row-title\s*\{[^}]*color:\s*var\(--muted\)/);
  assert.match(css, /\.index \.row:hover \.row-title[^}]*color:\s*var\(--ink\)/);
  assert.match(css, /\.index \.row:focus-visible \.row-title[^}]*color:\s*var\(--ink\)/);
});
for (const prefix of ['', 'ua/']) test(`AC7: ${prefix || 'en/'} adaptive geometry preserves photo shape without overlap`, () => {
  const html = read(`${prefix}index.html`);
  const canvas = attrs(html.match(/<div([^>]*class="home-collage"[^>]*)>/)[1]);
  const properties = s => Object.fromEntries([...s.matchAll(/--([a-z]+[234]):([\d.]+)%?/g)].map(m => [m[1], Number(m[2])]));
  const ratios = properties(canvas.style);
  const tiles = [...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)].filter(m => hasClass(attrs(m[1]), 'collage-tile'));
  for (const [columns, count] of [[2, 8], [3, 14], [4, 18]]) {
    const visible = tiles.map(m => ({ geometry: properties(attrs(m[1]).style), image: attrs(m[2].match(/<img\b([^>]*)>/)[1]), preview: attrs(m[1])['data-preview'] })).filter(t => `w${columns}` in t.geometry);
    assert.equal(visible.length, count, `${columns} columns visible count`);
    assert.ok(ratios[`ratio${columns}`] > 0, 'canvas ratio exists');
    assert.equal(new Set(visible.filter(t => t.preview).map(t => t.preview)).size, columns === 2 ? 2 : 3, 'two compact videos or three expanded videos');
    const rects = visible.map(({ geometry: g, image }) => {
      const r = { x: g[`x${columns}`], y: g[`y${columns}`], w: g[`w${columns}`], h: g[`h${columns}`] };
      assert.ok(Object.values(r).every(Number.isFinite));
      assert.ok(r.x >= 0 && r.y >= 0 && r.x + r.w <= 100.001 && r.y + r.h <= 100.001, 'tile within canvas');
      const ratio = r.w / r.h * ratios[`ratio${columns}`];
      assert.ok(Math.abs(ratio / (Number(image.width) / Number(image.height)) - 1) < .001, 'native aspect ratio');
      return r;
    });
    assert.equal(new Set(rects.map(r => r.x)).size, columns);
    if (columns === 2) {
      assert.equal(rects[6].x, 0, 'bottom speaker photo moves to left column');
      const bottom = rects.reduce((a, b) => a.y + a.h > b.y + b.h ? a : b);
      assert.equal(bottom.x, 0, 'two-column canvas finishes on the left');
    }
    for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) {
      const a = rects[i], b = rects[j];
      assert.ok(a.x + a.w <= b.x + .001 || b.x + b.w <= a.x + .001 || a.y + a.h <= b.y + .001 || b.y + b.h <= a.y + .001, 'tiles never overlap');
    }
  }
});
test('AC8: playing video hides poster pixels; inactive fallback remains in markup', () => {
  const css = read('styles/site.css');
  assert.match(css, /\.collage-tile:has\(video\.on\) img\s*\{\s*visibility:\s*hidden/);
  for (const prefix of ['', 'ua/']) {
    const html = read(`${prefix}index.html`);
    const tiles = [...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)].filter(m => hasClass(attrs(m[1]), 'collage-tile'));
    tiles.forEach((m, i) => {
      const sources = [...m[2].matchAll(/<source\b([^>]*)>/g)].map(x => attrs(x[1]));
      const limit = i >= 14 ? '111.99rem' : (i === 7 || (i >= 8 && i !== 12)) ? '79.99rem' : '60.99rem';
      assert.ok(sources.some(s => s.media.includes(limit) && s.srcset.startsWith('data:image/')), 'hidden tile serves a tiny inline fallback instead of downloading photo');
    });
  }
});

test('AC3: compact desktop starts only two videos and resize unloads the expanded video', () => {
  const p = setup({ expanded: false });
  assert.equal(p.videos().length, 2, 'no request for third video in compact desktop');
  p.expanded(true); assert.equal(p.videos().length, 3);
  const third = p.videos()[2];
  p.expanded(false); assert.equal(p.videos().length, 2);
  assert.ok(third.paused && !third.getAttribute('src'), 'hidden third video releases download');
});

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
  assert.ok(tiles.length >= 8, 'at least eight simultaneous tiles');
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
  assert.ok(previews.length >= 2, 'multiple small videos present concurrently');
  for (const src of previews) {
    assert.match(src, /^\/media\/video\/previews\/.+\.mp4$/);
    assert.ok(statSync(new URL(`..${src}`, import.meta.url)).size < 3 * 1024 * 1024, 'preview remains below 3 MB');
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
function setup({ desktop = true, reduced = false, saveData = false, floating = false, finePointer = true } = {}) {
  const stage = new Element(), button = new Element(), doc = new Element();
  const overlay = new Element(), hoverImage = new Element(), row = new Element();
  overlay.hidden = true; overlay.style = {}; overlay.offsetWidth = 360; overlay.offsetHeight = 240;
  overlay.querySelector = () => hoverImage;
  row.setAttribute('data-hover-image', '/media/photo/project.webp');
  row.getBoundingClientRect = () => ({ right: 320, top: 100, height: 50 });
  const hosts = [new Element(), new Element()];
  hosts.forEach((h, i) => { h.setAttribute('data-preview', `/media/video/previews/${i}.mp4`); h.dataset.preview = h.getAttribute('data-preview'); });
  const videos = () => hosts.flatMap(h => h.children);
  stage.querySelectorAll = s => s.includes('data-preview') ? hosts : s.includes('video') ? videos() : [];
  doc.hidden = false; doc.body = new Element();
  doc.documentElement = { lang: 'en' };
  doc.getElementById = id => id === 'stage' ? stage : id === 'collage-motion-toggle' ? button : id === 'project-hover-preview' && floating ? overlay : null;
  doc.querySelector = s => s.includes('collage-motion') ? button : null;
  doc.querySelectorAll = s => floating && s.includes('.row') ? [row] : [];
  doc.createElement = tag => {
    assert.equal(tag, 'video');
    const v = new Element(); v.paused = true;
    Object.defineProperty(v, 'src', { get() { return this.getAttribute('src'); }, set(value) { this.setAttribute('src', value); } });
    v.play = () => { v.paused = false; v.emit('playing'); return Promise.resolve(); };
    v.pause = () => { v.paused = true; };
    v.load = () => {};
    return v;
  };
  const desktopMQ = new Element(), reducedMQ = new Element(), connection = new Element();
  desktopMQ.matches = desktop; reducedMQ.matches = reduced; connection.saveData = saveData;
  const hoverMQ = new Element(); hoverMQ.matches = finePointer;
  const matchMedia = q => q.includes('61rem') ? desktopMQ : q.includes('reduced-motion') ? reducedMQ : hoverMQ;
  const js = read('scripts/site.js');
  const code = js.slice(js.indexOf('/* ---------- Home: index + stage'), js.indexOf('/* ---------- Editorial photo galleries'));
  const win = new Element(); win.matchMedia = matchMedia; win.innerWidth = 1400; win.innerHeight = 900;
  vm.runInNewContext(code, { document: doc, window: win, navigator: { connection }, matchMedia, setTimeout: fn => { fn(); return 1; }, clearTimeout() {} });
  return { videos, button, overlay, hoverImage, row, doc, win, hidden(value) { doc.hidden = value; doc.emit('visibilitychange'); }, desktop(value) { desktopMQ.matches = value; desktopMQ.emit('change'); } };
}
test('AC3: both previews autoplay immediately, silently, inline and looping on desktop', () => {
  const p = setup(); assert.equal(p.videos().length, 2);
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
  p.hidden(false); assert.equal(p.videos().length, 2); assert.ok(p.videos().every(v => !v.paused));
  p.button.emit('click'); assert.equal(p.button.getAttribute('aria-pressed'), 'true');
  p.hidden(true); p.hidden(false); assert.ok(p.videos().every(v => v.paused));
  p.button.emit('click'); assert.equal(p.button.getAttribute('aria-pressed'), 'false');
  assert.ok(p.videos().every(v => !v.paused));
  const mounted = p.videos(); p.desktop(false);
  assert.equal(p.videos().length, 0);
  assert.ok(mounted.every(v => v.paused && !v.getAttribute('src')));
  p.desktop(true); assert.equal(p.videos().length, 2);
});

for (const prefix of ['', 'ua/']) test(`AC6: ${prefix || 'en/'} floating preview keeps real project links and decorative semantics`, () => {
  const html = read(`${prefix}index.html`);
  const rows = [...html.matchAll(/<a\b([^>]*)>/g)].map(m => attrs(m[1])).filter(a => hasClass(a, 'row'));
  for (const row of rows) {
    assert.ok(row.href.startsWith('/'), 'real navigation URL retained');
    assert.match(row['data-hover-image'] || '', /^\/media\//, 'row identifies one project image');
    assert.ok(statSync(new URL(`..${row['data-hover-image']}`, import.meta.url)).isFile());
  }
  const overlay = [...html.matchAll(/<[a-z]+\b([^>]*)>/g)].map(m => attrs(m[1])).filter(a => a.id === 'project-hover-preview');
  assert.equal(overlay.length, 1, 'single shared floating preview');
  assert.equal(overlay[0]['aria-hidden'], 'true');
});

test('AC6: floating preview follows the row, preserves collage media, and dismisses without interception', () => {
  const p = setup({ floating: true }); const original = p.videos();
  const enter = () => { const e = new Event('pointerenter'); Object.assign(e, { pointerType: 'mouse', clientX: 200, clientY: 300 }); p.row.dispatchEvent(e); };
  enter(); assert.equal(p.overlay.hidden, false); assert.equal(p.hoverImage.src, '/media/photo/project.webp');
  assert.equal(p.overlay.style.left, '224px'); assert.deepEqual(p.videos(), original);
  for (const [target, event] of [[p.row, 'pointerleave'], [p.doc, 'scroll'], [p.win, 'blur']]) {
    enter(); target.emit(event); assert.equal(p.overlay.hidden, true, event);
  }
  enter(); const escape = new Event('keydown'); escape.key = 'Escape'; p.doc.dispatchEvent(escape); assert.equal(p.overlay.hidden, true);
  p.row.emit('focus'); assert.equal(p.overlay.hidden, false); p.row.emit('blur'); assert.equal(p.overlay.hidden, true);
});
for (const option of [{ desktop: false }, { finePointer: false }]) test(`AC6: no floating preview for ${JSON.stringify(option)}`, () => {
  const p = setup({ floating: true, ...option }); p.row.emit('focus'); assert.equal(p.overlay.hidden, true);
});

test('AC6: floating image cannot intercept clicks and project text has hover/focus affordances', () => {
  const css = read('styles/site.css');
  assert.match(css, /#project-hover-preview\s*\{[^}]*pointer-events:\s*none/);
  assert.match(css, /\.index \.row-title\s*\{[^}]*color:\s*var\(--muted\)/);
  assert.match(css, /\.index \.row:hover \.row-title[^}]*color:\s*var\(--ink\)/);
  assert.match(css, /\.index \.row:focus-visible \.row-title[^}]*color:\s*var\(--ink\)/);
});

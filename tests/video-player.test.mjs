// Acceptance contract: docs/video-player.md AC1–AC5. Tests inspect public output,
// not generator functions; real playback behavior is verified in a browser.
import test, { before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { projects, videoCatalogue } from '../data/projects.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = path => readFileSync(new URL(path, `file://${root}`), 'utf8');
const decode = s => s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
const attrs = tag => Object.fromEntries([...tag.matchAll(/([\w:-]+)(?:="([^"]*)")?/g)].map(m => [m[1], decode(m[2] ?? '')]));
const hasClass = (a, cls) => (a.class || '').split(/\s+/).includes(cls);
const tags = (html, name) => [...html.matchAll(new RegExp(`<${name}\\b[^>]*>`, 'g'))].map(m => attrs(m[0]));
function wrappers(html) {
  const result = [];
  const stack = [];
  for (const m of html.matchAll(/<div\b[^>]*>|<\/div>/g)) {
    if (m[0].startsWith('</')) {
      const start = stack.pop();
      if (start?.server) result.push({ index: start.index, html: html.slice(start.index, m.index + m[0].length) });
    } else stack.push({ index: m.index, server: hasClass(attrs(m[0]), 'server-player') });
  }
  return result.sort((a, b) => a.index - b.index).map(x => x.html);
}
const pages = [
  ...projects.filter(p => p.media.some(m => m.type === 'video')).map(p => ({ path: `work/${p.slug}/index.html`, media: p.media.filter(m => m.type === 'video') })),
  { path: 'video/index.html', media: videoCatalogue.flatMap(g => g.items) },
];
before(() => execFileSync(process.execPath, ['scripts/build.mjs'], { cwd: root, env: { ...process.env, SITE_ENV: 'live' }, stdio: 'pipe' }));

test('AC2/AC5: every server film has bilingual custom player markup and preserves source, poster and order', () => {
  let count = 0;
  for (const prefix of ['', 'ua/']) for (const page of pages) {
    const html = read(prefix + page.path);
    const expected = page.media.filter(m => m.platform === 'cf');
    const rendered = wrappers(html);
    assert.equal(rendered.length, expected.length, `${prefix}${page.path}: one server player per direct film`);
    rendered.forEach((block, i) => {
      count++;
      const videos = tags(block, 'video');
      assert.equal(videos.length, 1, 'one semantic video per player');
      const v = videos[0];
      assert.ok(hasClass(v, 'cf-video'));
      assert.equal(v['data-src'], expected[i].src, 'original direct source and sequence');
      assert.equal(v.poster, expected[i].poster, 'original poster');
      const posters = tags(block, 'img').filter(a => hasClass(a, 'video-poster'));
      assert.equal(posters.length, 1, 'separate image protects video loading state');
      assert.equal(posters[0].src, expected[i].poster);
      assert.ok(posters[0].alt !== undefined, 'poster alternative is explicit');
      assert.ok(!('src' in v), 'source deferred until hover or manual play');
      assert.ok('muted' in v, 'silent by default');
      assert.ok('playsinline' in v, 'no automatic fullscreen on phones');
      assert.equal(v.preload, 'none', 'no eager media transfer');
      assert.ok('controls' in v, 'progressive native controls before JS enhancement');
      for (const cls of ['video-toggle', 'video-sound']) {
        const controls = tags(block, 'button').filter(b => hasClass(b, cls));
        assert.equal(controls.length, 1, `${cls}: one button`);
        assert.equal(controls[0].type, 'button');
        assert.ok(controls[0]['aria-label']?.trim(), `${cls}: accessible label`);
        if (prefix) assert.match(controls[0]['aria-label'], /[А-Яа-яІіЇїЄєҐґ]/, 'Ukrainian control label');
      }
      const seeks = tags(block, 'input').filter(a => hasClass(a, 'video-seek'));
      assert.equal(seeks.length, 0, 'all server films omit timeline DOM');
      assert.ok('loop' in v, 'all server films loop through native media playback');
      assert.doesNotMatch(block, /class="[^"]*\bvideo-(?:clock|timeline)\b/, 'all server films omit timeline and clock DOM');
      assert.ok(block.indexOf('video-toggle') < block.indexOf('<video'), 'buttons precede frame');
      assert.match(block, /<noscript\b[\s\S]*?<a\b[^>]*href="/, 'no-JS playback link');
    });
  }
  assert.ok(count > 0, 'contract exercises actual server films');
});

test('Reels refinement: bilingual project omits video captions while other film pages retain them', () => {
  for (const prefix of ['', 'ua/']) for (const page of pages) {
    const captions = tags(read(prefix + page.path), 'p').filter(a => hasClass(a, 'vid-title'));
    assert.equal(captions.length, page.path === 'work/reels/index.html' ? 0 : page.media.length, `${prefix}${page.path}: scoped caption behavior`);
  }
});

test('AC5: YouTube and Vimeo remain poster-triggered embeds with original identity and order', () => {
  let count = 0;
  for (const prefix of ['', 'ua/']) for (const page of pages) {
    const html = read(prefix + page.path);
    const expected = page.media.filter(m => m.platform !== 'cf');
    const buttons = tags(html, 'button').filter(b => hasClass(b, 'player-btn'));
    const thirdParty = buttons.filter(b => b['data-platform'] !== 'cf');
    assert.deepEqual(thirdParty.map(b => [b['data-platform'], b['data-video-id']]), expected.map(m => [m.platform, m.videoId]), `${prefix}${page.path}: third-party identity and order`);
    assert.equal(buttons.filter(b => b['data-platform'] === 'cf').length, 0, 'server films use inline controls');
    count += expected.length;
  }
  assert.ok(count > 0, 'contract exercises existing third-party films');
});

test('AC2: icon hit targets meet 44px in both axes and controls align above the frame to its right', () => {
  const css = read('styles/site.css');
  const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)];
  for (const cls of ['video-toggle', 'video-sound']) {
    const declarations = rules.filter(m => m[1].includes(`.${cls}`)).map(m => m[2]).join(';');
    for (const dimension of ['width', 'height']) {
      const property = dimension === 'width' ? '(?:min-)?(?:width|inline-size)' : '(?:min-)?(?:height|block-size)';
      assert.match(declarations, new RegExp(`${property}\\s*:\\s*(?:44|4[5-9]|[5-9]\\d)px`), `${cls}: ${dimension} at least 44px`);
    }
  }
  const toolbar = rules.filter(m => /\.video-(?:toolbar|controls)/.test(m[1])).map(m => m[2]).join(';');
  assert.match(toolbar, /justify-content\s*:\s*(?:flex-)?end/, 'toolbar controls align right');
});


test('H4: poster remains visible until playing, does not intercept controls, and native aspect is retained', () => {
  const css = read('styles/site.css');
  assert.match(css, /\.video-poster[^{}]*\{[^}]*pointer-events:\s*none/);
  assert.match(css, /\.server-player\[data-ready=["']true["']\][^{}]*\.video-poster[^{}]*\{[^}]*(?:opacity:\s*0|visibility:\s*hidden)/);
});
test('Navigation: Rates & Terms carries current-page dash in both desktop rails', () => {
  for (const prefix of ['', 'ua/']) {
    const html = read(`${prefix}rates/index.html`);
    assert.match(html, new RegExp(`<a href="/${prefix}rates/" aria-current="page">`));
  }
  const css = read('styles/site.css');
  const dash = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].find(m => m[1].includes('.rail-foot') && m[1].includes("[aria-current='page']::before"));
  assert.ok(dash, 'current-page dash selector includes actual rail footer');
  assert.match(dash[2], /content:/);
});

test('Navigation: hover dash covers main rail links and Rates only in footer', () => {
  const css = read('styles/site.css');
  const pseudoRules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].filter(m => m[1].includes(':hover::before') && /content:/.test(m[2]));
  const selectors = pseudoRules.map(m => m[1]).join(',');
  assert.match(selectors, /\.rail-nav\s+a:hover::before/, 'primary and secondary rail groups get hover dash');
  assert.match(selectors, /\.rail-foot[^,]*rates[^,]*:hover::before/, 'footer hover dash is explicitly scoped to Rates');
  assert.doesNotMatch(selectors, /\.rail-foot\s*>?\s*a:hover::before/, 'external/footer theme and language links do not gain a dash');
});

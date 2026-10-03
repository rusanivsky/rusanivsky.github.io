// Run after: SITE_ENV=live node scripts/build.mjs
// Acceptance tests for docs/wordmusic-case.md (AC1–AC10), written from the
// contract independently of the implementation. Font-binary checks for AC3
// (cmap, glyph names, GSUB features, name table) live in
// tests/wordmusic-case-font.py (fontTools).
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, relative, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = path => readFileSync(resolve(root, path), 'utf8');
const exists = path => existsSync(resolve(root, path));
const SLUG = 'wordmusic-design';
const PAGES = { en: `work/${SLUG}/index.html`, ua: `ua/work/${SLUG}/index.html` };
const CHAPTERS = ['mark', 'typeface', 'system', 'in-use', 'second-event'];
const HEADINGS = {
  en: ['Mark', 'Tembrava Display', 'System', 'One concert, every format', 'Vivre, Aimer, Rêver…'],
  ua: ['Знак', 'Tembrava Display', 'Система', 'Один концерт — усі формати', 'Vivre, Aimer, Rêver…'],
};
const LICENSE = { en: '/tembrava/license/', ua: '/ua/tembrava/license/' };
const privateSource = /(?:file:\/\/|\/Users\/|\/private\/|\/Volumes\/|fsprivate|KR\/Production\/|GoogleDrive|My Drive|drive\.google\.com|work\/source\/)/i;
const CYR = /[Ѐ-ӿ]/;

// ---------- minimal HTML tree ----------
const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);
const NAMED = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', hellip: '…', mdash: '—', ndash: '–',
  laquo: '«', raquo: '»', lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”', ecirc: 'ê', eacute: 'é', egrave: 'è',
  agrave: 'à', acirc: 'â', ccedil: 'ç', ocirc: 'ô', icirc: 'î', ucirc: 'û', euml: 'ë', iuml: 'ï', shy: '­', thinsp: ' ', copy: '©' };
const decode = s => s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
  if (e[0] === '#') return String.fromCodePoint(e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
  return NAMED[e.toLowerCase()] ?? m;
});
function parseAttrs(src) {
  const attrs = {};
  for (const m of src.matchAll(/([^\s"'>\/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) {
    attrs[m[1].toLowerCase()] = decode(m[2] ?? m[3] ?? m[4] ?? '');
  }
  return attrs;
}
function parseHTML(html) {
  const doc = { tag: '#document', attrs: {}, children: [], parent: null };
  let cur = doc;
  const re = /<!--[\s\S]*?-->|<!doctype[^>]*>|<(script|style)\b([^>]*)>([\s\S]*?)<\/\1\s*>|<\/([a-zA-Z][\w:-]*)\s*>|<([a-zA-Z][\w:-]*)((?:"[^"]*"|'[^']*'|[^'">])*)>|([^<]+|<)/gi;
  for (const m of html.matchAll(re)) {
    if (m[1]) {
      const el = { tag: m[1].toLowerCase(), attrs: parseAttrs(m[2]), children: [], parent: cur, raw: m[3] };
      cur.children.push(el);
    } else if (m[4]) {
      const tag = m[4].toLowerCase();
      let n = cur;
      while (n && n.tag !== tag) n = n.parent;
      if (n && n.parent) cur = n.parent;
    } else if (m[5]) {
      const tag = m[5].toLowerCase();
      const selfClose = /\/\s*$/.test(m[6]);
      const el = { tag, attrs: parseAttrs(m[6].replace(/\/\s*$/, '')), children: [], parent: cur };
      cur.children.push(el);
      if (!VOID.has(tag) && !selfClose) cur = el;
    } else if (m[7] !== undefined) {
      cur.children.push({ tag: '#text', text: decode(m[7]), parent: cur });
    }
  }
  return doc;
}
const all = (node, pred, out = []) => {
  for (const c of node.children || []) {
    if (c.tag !== '#text' && pred(c)) out.push(c);
    all(c, pred, out);
  }
  return out;
};
const textOf = node => node.tag === '#text' ? node.text : (node.children || []).map(textOf).join('');
const norm = s => s.replace(/\s+/g, ' ').trim();
const classes = el => (el.attrs?.class || '').split(/\s+/).filter(Boolean);
const hasClass = (el, c) => classes(el).includes(c);
const ancestors = el => { const out = []; for (let n = el.parent; n; n = n.parent) out.push(n); return out; };
const isTembrava = el => hasClass(el, 'tembrava');

const cache = {};
function page(lang) {
  if (cache[lang]) return cache[lang];
  assert.ok(exists(PAGES[lang]), `${PAGES[lang]} is built`);
  const html = read(PAGES[lang]);
  const doc = parseHTML(html);
  const main = all(doc, e => e.tag === 'main')[0];
  assert.ok(main, `${lang}: <main> present`);
  const chapters = all(main, e => e.tag === 'section' && 'data-chapter' in e.attrs);
  const chapter = name => {
    const found = chapters.filter(s => s.attrs['data-chapter'] === name);
    assert.equal(found.length, 1, `${lang}: exactly one <section data-chapter="${name}">`);
    return found[0];
  };
  return (cache[lang] = { html, doc, main, chapters, chapter });
}
const projects = () => JSON.parse(read('data/design-projects.json'));
const project = () => {
  const p = projects().find(x => x.slug === SLUG);
  assert.ok(p, `data/design-projects.json keeps ${SLUG}`);
  return p;
};

// Case-specific CSS: inline <style> blocks plus local stylesheets other than site.css.
function caseStylesheets(lang) {
  const { doc } = page(lang);
  return all(doc, e => e.tag === 'link' && /\bstylesheet\b/i.test(e.attrs.rel || '') && (e.attrs.href || '').startsWith('/'))
    .map(e => e.attrs.href.split(/[?#]/)[0])
    .filter(h => h !== '/styles/site.css');
}
function caseCSS(lang) {
  const { doc } = page(lang);
  const inline = all(doc, e => e.tag === 'style').map(e => e.raw || '');
  const linked = caseStylesheets(lang).map(h => {
    assert.ok(exists(h.slice(1)), `${lang}: linked stylesheet exists: ${h}`);
    return read(h.slice(1));
  });
  return [...inline, ...linked].join('\n').replace(/\/\*[\s\S]*?\*\//g, '');
}
const cssRules = css => [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(m => ({ selector: norm(m[1]), body: m[2] }));
const decl = (body, prop) => {
  const m = body.match(new RegExp(`(?:^|;)\\s*${prop}\\s*:\\s*([^;]+)`, 'i'));
  return m ? m[1].trim() : null;
};
const firstFamily = v => v.split(',')[0].trim().replace(/^['"]|['"]$/g, '');

const fontRefs = text => [...new Set([...text.matchAll(/\/fonts\/[^"')\s,;]*tembrava[^"')\s,;]*/gi)].map(m => m[0].split(/[?#]/)[0]))];
const FONT_URL = /^\/fonts\/tembrava-case-[0-9a-f]{8}\.woff2$/;

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === '.git' || name === 'node_modules') continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out); else out.push(p);
  }
  return out;
}

const svgPaths = svg => all(svg, e => e.tag === 'path').map(e => (e.attrs.d || '').replace(/\s+/g, ' ').trim()).filter(Boolean);
const MARKS = [
  { name: 'word&music', glyph: 'wordmusic.logo', label: /word\s*&\s*music/i },
  { name: 'w&m', glyph: 'wandm.logo', label: /(?:^|[^\p{L}])w\s*&\s*m(?:$|[^\p{L}])/iu },
  { name: 'wm', glyph: 'wm.logo', label: /(?:^|[^\p{L}&])wm(?:$|[^\p{L}&])/iu },
];
const markSvgs = (scope, mark) => all(scope, e => e.tag === 'svg' && e.attrs.role === 'img' && mark.label.test(e.attrs['aria-label'] || ''));
function marksData() {
  assert.ok(exists('data/wordmusic-marks.json'), 'data/wordmusic-marks.json exists');
  const raw = read('data/wordmusic-marks.json');
  const data = JSON.parse(raw);
  const paths = new Set();
  (function scan(v) {
    if (typeof v === 'string') { if (/^\s*[Mm]\s*-?[\d.]/.test(v)) paths.add(v.replace(/\s+/g, ' ').trim()); }
    else if (v && typeof v === 'object') Object.values(v).forEach(scan);
  })(data);
  return { raw, data, paths };
}

function imagesIn(node) { return all(node, e => e.tag === 'img'); }
const ratio = img => Number(img.attrs.width) / Number(img.attrs.height);
const near = (r, target, tol = 0.02) => Math.abs(r - target) / target <= tol;

// =====================================================================

test('word&music case — system story (docs/wordmusic-case.md)', async t => {
  await t.test('AC1: five chapters in story order after the unchanged project head', () => {
    const p = project();
    for (const lang of ['en', 'ua']) {
      const { main, chapters } = page(lang);
      assert.deepEqual(chapters.map(s => s.attrs['data-chapter']), CHAPTERS, `${lang}: data-chapter order`);
      chapters.forEach((s, i) => {
        const h2 = all(s, e => e.tag === 'h2')[0];
        assert.ok(h2, `${lang}: ${CHAPTERS[i]} has an <h2>`);
        assert.equal(norm(textOf(h2)), HEADINGS[lang][i], `${lang}: ${CHAPTERS[i]} heading`);
      });
      const h1 = all(main, e => e.tag === 'h1');
      assert.equal(h1.length, 1, `${lang}: one h1`);
      assert.equal(norm(textOf(h1[0])), 'word&music', `${lang}: title`);
      const head = ancestors(h1[0]).find(a => a.parent === main) || h1[0];
      const headText = norm(textOf(head));
      assert.ok(headText.includes(p.client), `${lang}: client in project head`);
      assert.ok(headText.includes(p.scopeRole[lang]), `${lang}: role in project head`);
      assert.equal(p.title[lang], 'word&music');
      // Head precedes every chapter in document order.
      const order = all(main, () => true);
      const headIdx = order.indexOf(h1[0]);
      for (const s of chapters) assert.ok(order.indexOf(s) > headIdx, `${lang}: chapter ${s.attrs['data-chapter']} follows the head`);
    }
  });

  await t.test('AC2: three marks as inline SVG on light and dark grounds, paths from Full 1.0 outlines', () => {
    const { raw, paths } = marksData();
    assert.match(raw, /8ac4d914/i, 'source font SHA-256 prefix recorded');
    for (const m of MARKS) assert.ok(raw.includes(m.glyph), `marks data names glyph ${m.glyph}`);
    assert.ok(paths.size >= 3, 'marks data stores SVG path outlines');
    for (const lang of ['en', 'ua']) {
      const mark = page(lang).chapter('mark');
      const svgs = all(mark, e => e.tag === 'svg' && e.attrs.role === 'img');
      let total = 0;
      for (const m of MARKS) {
        const found = markSvgs(mark, m);
        assert.equal(found.length, 2, `${lang}: ${m.name} drawn twice (light and dark ground)`);
        total += found.length;
        for (const svg of found) {
          const d = svgPaths(svg);
          assert.ok(d.length, `${lang}: ${m.name} svg has path outlines`);
          assert.ok(d.every(x => paths.has(x)), `${lang}: ${m.name} paths come from data/wordmusic-marks.json`);
        }
      }
      assert.equal(total, 6, `${lang}: six SVG marks`);
      assert.equal(svgs.filter(s => MARKS.some(m => m.label.test(s.attrs['aria-label'] || ''))).length, 6);
      for (const svg of svgs) {
        assert.ok((svg.attrs['aria-label'] || '').trim(), `${lang}: every role=img svg is labelled`);
        assert.equal(all(svg, e => ['image', 'text', 'foreignobject', 'textpath'].includes(e.tag)).length, 0,
          `${lang}: marks use no raster and no font`);
        for (const u of all(svg, e => e.tag === 'use')) {
          assert.ok(!/^(?:https?:|\/)/.test(u.attrs.href || u.attrs['xlink:href'] || ''), `${lang}: mark <use> stays inline`);
        }
      }
      assert.ok(!isTembrava(mark) && all(mark, e => e.tag === 'svg').every(s => !isTembrava(s) && !ancestors(s).some(isTembrava)),
        `${lang}: marks are not set in the font`);
    }
  });

  await t.test('AC3: exactly one subset font, @font-face only on the two case pages', () => {
    const urls = {};
    for (const lang of ['en', 'ua']) {
      const css = caseCSS(lang);
      const faces = cssRules(css).filter(r => /^@font-face$/i.test(r.selector));
      const tFaces = faces.filter(r => /tembrava/i.test(r.body));
      assert.equal(tFaces.length, 1, `${lang}: one Tembrava @font-face on the case page`);
      assert.match(decl(tFaces[0].body, 'font-display') || '', /^swap$/i, `${lang}: font-display: swap`);
      const refs = fontRefs(page(lang).html + '\n' + css);
      assert.equal(refs.length, 1, `${lang}: exactly one Tembrava font file referenced: ${refs.join(', ')}`);
      assert.match(refs[0], FONT_URL, `${lang}: font URL shape`);
      assert.ok(exists(refs[0].slice(1)), `${lang}: font file exists`);
      urls[lang] = refs[0];
    }
    assert.equal(urls.en, urls.ua, 'both languages load the same subset');
    const site = read('styles/site.css');
    assert.doesNotMatch(site, /tembrava/i, 'styles/site.css has no Tembrava @font-face');
    const caseSheets = new Set([...caseStylesheets('en'), ...caseStylesheets('ua')]);
    const others = walk(root).filter(f => f.endsWith('.html'))
      .map(f => relative(root, f))
      .filter(f => f !== PAGES.en && f !== PAGES.ua);
    for (const f of others) {
      const html = read(f);
      assert.doesNotMatch(html, /tembrava-case-/i, `${f}: subset font not loaded outside the case`);
      for (const sheet of caseSheets) assert.ok(!html.includes(sheet), `${f}: case stylesheet ${sheet} not linked`);
    }
    // Non-goal: no font file other than the subset is published.
    const fontFiles = walk(root).map(f => relative(root, f))
      .filter(f => /\.(?:woff2?|otf|ttf|eot)$/i.test(f) && /tembrava/i.test(f));
    assert.deepEqual(fontFiles, [urls.en.slice(1)], 'the subset is the only Tembrava font file in the repository');
  });

  await t.test('AC3: every .tembrava element is set in the subset face', () => {
    for (const lang of ['en', 'ua']) {
      const css = caseCSS(lang);
      const rules = cssRules(css);
      const face = rules.find(r => /^@font-face$/i.test(r.selector) && /tembrava/i.test(r.body));
      assert.ok(face, `${lang}: Tembrava @font-face`);
      const family = firstFamily(decl(face.body, 'font-family') || '');
      assert.ok(family, `${lang}: @font-face names a family`);
      const rule = rules.find(r => r.selector.split(',').some(s => /\.tembrava(?![\w-])\s*$/.test(s.trim()))
        && decl(r.body, 'font-family') && firstFamily(decl(r.body, 'font-family')) === family);
      assert.ok(rule, `${lang}: .tembrava { font-family: "${family}", … }`);
      const els = all(page(lang).main, isTembrava);
      assert.ok(els.length, `${lang}: page has .tembrava elements`);
      for (const el of els) {
        const ff = decl(el.attrs.style || '', 'font-family');
        assert.ok(!ff || firstFamily(ff) === family, `${lang}: inline font-family does not override the subset`);
        assert.ok(!/text-transform\s*:\s*(?!none)/i.test(el.attrs.style || ''), `${lang}: no inline text-transform on live type (cmap is built from text content)`);
      }
      assert.ok(!rules.some(r => decl(r.body, 'text-transform') && !/^none$/i.test(decl(r.body, 'text-transform'))),
        `${lang}: case CSS does not transform case of live type (cmap is built from text content)`);
    }
  });

  await t.test('AC3: specimen — Cyrillic, Latin, figures, both concert titles, ss01 on live text, no live full alphabet', () => {
    for (const lang of ['en', 'ua']) {
      const { main } = page(lang);
      const els = all(main, isTembrava);
      const texts = els.map(e => norm(textOf(e)));
      const joined = texts.join(' ');
      assert.match(joined, CYR, `${lang}: live Cyrillic`);
      assert.match(joined, /[A-Za-z]/, `${lang}: live Latin`);
      assert.match(joined, /\d/, `${lang}: live figures`);
      const lower = joined.toLocaleLowerCase('uk');
      assert.ok(lower.includes('на крилах кохання'), `${lang}: title "На крилах кохання" in live type`);
      assert.ok(/vivre, aimer, rêver/.test(lower), `${lang}: title "Vivre, Aimer, Rêver…" in live type`);
      for (const t of texts) {
        const squashed = t.replace(/[\s ]/g, '').toUpperCase();
        assert.ok(!squashed.includes('ABCDEFGHIJKLMNOPQRSTUVWXYZ'), `${lang}: Latin alphabet not live text`);
        assert.ok(!squashed.includes('АБВГҐДЕЄЖЗИІЇЙКЛМНОПРСТУФХЦЧШЩЬЮЯ'), `${lang}: Cyrillic alphabet not live text`);
      }
      // ss01 via font-feature-settings on a live-text element containing Л or Д.
      const ss01Rules = cssRules(caseCSS(lang)).filter(r => /font-feature-settings\s*:[^;]*["']ss01["']/i.test(r.body));
      const ss01Classes = new Set(ss01Rules.flatMap(r => r.selector.split(',').map(s => (s.trim().match(/\.([\w-]+)[^.\s]*$/) || [])[1]).filter(Boolean)));
      const ss01Els = els.filter(e => {
        if (/font-feature-settings\s*:[^;]*["']ss01["']/i.test(e.attrs.style || '')) return true;
        return [e, ...ancestors(e)].some(n => classes(n).some(c => ss01Classes.has(c)))
          || all(e, n => /font-feature-settings\s*:[^;]*["']ss01["']/i.test(n.attrs.style || '') || classes(n).some(c => ss01Classes.has(c))).length > 0;
      });
      assert.ok(ss01Els.some(e => /[ЛДлд]/.test(textOf(e))), `${lang}: ss01 demonstrated on live Л/Д`);
      assert.ok(page(lang).chapter('typeface'), `${lang}: typeface chapter`);
      assert.ok(all(page(lang).chapter('typeface'), isTembrava).length, `${lang}: specimen lives in the typeface chapter`);
    }
  });

  await t.test('AC4: dlig explained with typed word&music beside the SVG mark, no Full font', () => {
    const { paths } = marksData();
    for (const lang of ['en', 'ua']) {
      const typeface = page(lang).chapter('typeface');
      const typed = all(typeface, isTembrava).filter(e => norm(textOf(e)) === 'word&music');
      assert.ok(typed.length, `${lang}: typed "word&music" in the subset face`);
      const mark = markSvgs(typeface, MARKS[0]);
      assert.ok(mark.length, `${lang}: SVG word&music mark in the typeface chapter`);
      assert.ok(mark.every(s => svgPaths(s).length && svgPaths(s).every(d => paths.has(d))), `${lang}: mark paths from data`);
      const txt = norm(textOf(typeface));
      if (lang === 'en') {
        assert.match(txt, /\bFull\b/, 'en: names the internal Full build');
        assert.match(txt, /\bRetail\b/, 'en: names the Retail build');
      } else {
        assert.match(txt, /Full|повн/i, 'ua: names the internal Full build');
        assert.match(txt, /Retail|роздрібн|продаж/i, 'ua: names the Retail build');
      }
    }
  });

  await t.test('AC5: system — palettes with hex values from sources, live hierarchy, form crops', () => {
    const p = project();
    assert.ok(Array.isArray(p.story) && p.story.length, 'design-projects.json: story array drives the chapters');
    // A swatch = a "#rrggbb" string whose object, or an enclosing object in
    // story, records the export it was sampled from. Schema is left open.
    const FILE = /[^"/\\\s]+\.(?:png|jpe?g|webp|pdf|tiff?|psd|ai|indd)\b/i;
    const ownFile = o => Object.values(o).find(x => typeof x === 'string' && FILE.test(x));
    const swatches = [];
    (function scan(v, source) {
      if (Array.isArray(v)) return v.forEach(x => scan(x, source));
      if (v && typeof v === 'object') {
        const here = ownFile(v)?.match(FILE)[0] || source;
        const hex = Object.values(v).find(x => typeof x === 'string' && /^#[0-9a-f]{6}$/i.test(x));
        if (hex && here) swatches.push({ hex: hex.toLowerCase(), source: here });
        Object.values(v).forEach(x => scan(x, here));
      }
    })(p.story, null);
    const unique = [...new Set(swatches.map(s => s.hex))];
    assert.ok(unique.length >= 8, `at least 4 swatches per concert, each with its source export, in story data (found ${unique.length})`);
    const sourceFiles = new Set(swatches.map(s => s.source));
    assert.ok(sourceFiles.size >= 2, 'palettes sampled from exports of both concerts (≥2 source files)');
    for (const lang of ['en', 'ua']) {
      const system = page(lang).chapter('system');
      const txt = textOf(system).toLowerCase();
      for (const hex of unique) assert.ok(txt.includes(hex), `${lang}: ${hex} visible as text`);
      assert.ok(all(system, isTembrava).length, `${lang}: type hierarchy as live text`);
      assert.ok(imagesIn(system).length >= 2, `${lang}: heart and ellipse forms as images`);
    }
  });

  await t.test('AC6: one concert, every format', () => {
    const p = project();
    assert.doesNotMatch(JSON.stringify(p), /02-POST-NIGHT-4x5/i, 'broken export not referenced in data');
    for (const lang of ['en', 'ua']) {
      const inUse = page(lang).chapter('in-use');
      assert.doesNotMatch(page(lang).html, /02-POST-NIGHT-4x5/i, `${lang}: broken export not used`);
      const imgs = imagesIn(inUse);
      assert.ok(imgs.length >= 8, `${lang}: poster, post, story, banner and ≥4 carousel slides (found ${imgs.length} images)`);
      const rs = imgs.map(ratio);
      assert.ok(rs.some(r => near(r, 297 / 420)), `${lang}: A3 poster`);
      assert.ok(rs.some(r => near(r, 4 / 5)), `${lang}: 4:5 post`);
      assert.ok(rs.some(r => near(r, 9 / 16)), `${lang}: 9:16 story`);
      assert.ok(rs.some(r => near(r, 16 / 9)), `${lang}: 16:9 EventMate banner`);
    }
  });

  await t.test('AC7: second event — 2–3 applications', () => {
    for (const lang of ['en', 'ua']) {
      const n = imagesIn(page(lang).chapter('second-event')).length;
      assert.ok(n >= 2 && n <= 3, `${lang}: 2–3 applications of Vivre, Aimer, Rêver… (found ${n})`);
    }
  });

  await t.test('AC8: local WebP with ladder, size, in p.media, inside .design-frame; archive posters off the page', () => {
    const p = project();
    const ladder = JSON.parse(read('data/media-ladder.json'));
    const mediaSrc = new Set(p.media.map(m => m.src));
    for (const m of p.media) assert.match(m.src, /^\/media\/design\/cases\/[^/]+\.webp$/, `media ${m.id}: local WebP`);
    for (const lang of ['en', 'ua']) {
      const { chapters, html } = page(lang);
      const imgs = chapters.flatMap(imagesIn);
      assert.ok(imgs.length, `${lang}: chapters render images`);
      for (const img of imgs) {
        const src = img.attrs.src || '';
        assert.match(src, /^\/media\/design\/cases\/[^/?#]+\.webp$/, `${lang}: local WebP ${src}`);
        assert.ok(exists(src.slice(1)) && statSync(resolve(root, src.slice(1))).size > 0, `${lang}: file exists ${src}`);
        assert.ok(mediaSrc.has(src), `${lang}: ${src} listed in p.media`);
        assert.ok(Array.isArray(ladder[src]) && ladder[src].length, `${lang}: ${src} has a media-ladder entry`);
        assert.ok((img.attrs.srcset || '').trim(), `${lang}: ${src} has srcset`);
        assert.ok(Number(img.attrs.width) > 0 && Number(img.attrs.height) > 0, `${lang}: ${src} width/height`);
        assert.ok(ancestors(img).some(a => hasClass(a, 'design-frame')), `${lang}: ${src} inside .design-frame`);
        assert.ok(!ancestors(img).some(a => a.tag === 'a'), `${lang}: ${src} is static, not a link`);
        assert.ok((img.attrs.alt || '').trim(), `${lang}: ${src} has alt text`);
      }
      if (lang === 'ua') assert.ok(imgs.some(i => CYR.test(i.attrs.alt || '')), 'ua: alt text is localised');
      assert.doesNotMatch(html, /word-and-music-0[67]/, `${lang}: archive posters 06/07 not rendered`);
    }
    for (const n of ['06', '07']) assert.ok(exists(`media/design/cases/word-and-music-${n}.webp`), `archive poster ${n} stays in the repository`);
    assert.ok(!p.media.some(m => /word-and-music-0[67]/.test(m.src)), 'archive posters left the case media');
  });

  await t.test('AC9: licence page in own language and wordandmusic.art', () => {
    for (const lang of ['en', 'ua']) {
      const hrefs = all(page(lang).main, e => e.tag === 'a').map(a => a.attrs.href || '');
      assert.ok(hrefs.includes(LICENSE[lang]), `${lang}: links ${LICENSE[lang]}`);
      const other = LICENSE[lang === 'en' ? 'ua' : 'en'];
      assert.ok(!hrefs.includes(other), `${lang}: does not link the other language's licence (${other})`);
      assert.ok(hrefs.includes('https://wordandmusic.art/'), `${lang}: links https://wordandmusic.art/`);
    }
  });

  await t.test('AC10: mechanical design bans and no private paths', () => {
    assert.doesNotMatch(read('data/design-projects.json'), privateSource, 'design-projects.json: no private paths');
    assert.doesNotMatch(marksData().raw, privateSource, 'wordmusic-marks.json: no private paths');
    for (const lang of ['en', 'ua']) {
      const { html, main, chapters } = page(lang);
      assert.doesNotMatch(html, privateSource, `${lang}: no private paths`);
      const css = caseCSS(lang);
      assert.doesNotMatch(css, /monospace/i, `${lang}: no monospace in case CSS`);
      assert.doesNotMatch(css, /font-style\s*:\s*(?:italic|oblique)/i, `${lang}: no italic in case CSS`);
      for (const h of all(main, e => /^h[1-6]$/.test(e.tag))) {
        assert.equal(all(h, e => e.tag === 'em' || e.tag === 'i').length, 0, `${lang}: no italic in heading "${norm(textOf(h))}"`);
        assert.doesNotMatch(h.attrs.style || '', /italic|oblique/i, `${lang}: no inline italic heading`);
        assert.doesNotMatch(norm(textOf(h)), /^0\d\b/, `${lang}: heading not numbered 01/02/03`);
      }
      for (const el of all(main, e => /monospace/i.test(e.attrs.style || ''))) assert.fail(`${lang}: inline monospace on <${el.tag}>`);
      for (const s of chapters) {
        for (const el of all(s, e => e.tag !== '#text' && e.children?.every(c => c.tag === '#text'))) {
          assert.doesNotMatch(norm(textOf(el)), /^0\d(?:\s*[\/·—–-]\s*0\d)?\.?$/, `${lang}: no "01/02/03"-style label in ${s.attrs['data-chapter']}`);
        }
      }
      for (const r of cssRules(css)) {
        if (/(?:^|[\s,>+~])(?:html|body|main)(?![\w-])|\.project(?![\w-])/.test(r.selector)) {
          assert.ok(!decl(r.body, 'background') && !decl(r.body, 'background-color'), `${lang}: case CSS does not change the page background (${r.selector})`);
        }
        const radius = decl(r.body, 'border-radius');
        if (radius && /(?:^|[\s,>+~])(?:a|button)(?![\w-])|btn|button|link|chip|pill|tag/i.test(r.selector)) {
          assert.doesNotMatch(radius, /\d{3,}(?:\.\d+)?px|\d+(?:\.\d+)?v(?:h|w|min|max)\b|\b999/i, `${lang}: no pill buttons (${r.selector})`);
        }
      }
    }
  });

  await t.test('CI runs the word&music acceptance tests (node and font)', () => {
    const wf = readdirSync(resolve(root, '.github/workflows')).map(f => read(`.github/workflows/${f}`)).join('\n');
    assert.match(wf, /tests\/wordmusic-case\.test\.mjs/, 'workflow runs tests/wordmusic-case.test.mjs');
    assert.match(wf, /tests\/wordmusic-case-font\.py/, 'workflow runs tests/wordmusic-case-font.py');
    assert.match(wf, /fonttools/i, 'workflow installs fontTools for the font test');
  });
});

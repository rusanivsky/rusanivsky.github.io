// Street photography as its own top-level section (2026-10-02).
// Acceptance criteria S1–S7: navigation, section page, the «After Five» series
// page, home row, absence from the Photography hub, legacy redirect, sitemap.
import test, { before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { projects } from '../data/projects.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = path => readFileSync(resolve(root, path), 'utf8');
const decode = s => s
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
  .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&middot;/g, '·').replace(/&rsquo;/g, '’').replace(/&ndash;/g, '–').replace(/&nbsp;/g, ' ')
  .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const attrs = tag => Object.fromEntries([...tag.matchAll(/([\w:-]+)(?:="([^"]*)")?/g)].map(m => [m[1], decode(m[2] ?? '')]));
const tags = (html, name) => [...html.matchAll(new RegExp(`<${name}\\b[^>]*>`, 'g'))].map(m => attrs(m[0]));
const text = html => decode(html.replace(/<[^>]*>/g, '')).replace(/\s+/g, ' ').trim();
const hasClass = (a, cls) => (a.class || '').split(/\s+/).includes(cls);
const links = html => [...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)].map(m => ({ ...attrs(m[1]), text: text(m[2]) }));
const build = () => execFileSync(process.execPath, ['scripts/build.mjs'], { cwd: root, env: { ...process.env, SITE_ENV: 'live' }, stdio: 'pipe' });

const PREFIXES = ['', 'ua/'];
const lang = prefix => (prefix ? 'ua' : 'en');
const SITE = 'https://rusanivsky.com/';
const L = {
  section: { en: 'Street photography', ua: 'Вулична фотографія' },
  series: { en: 'After Five', ua: 'Після п’ятої' },
  ongoing: { en: 'Personal · ongoing', ua: 'Особисте · триває' },
  placeholder: { en: 'The edit for this page is still being made', ua: 'Добірку для цієї сторінки ще роблю' },
};
const series = () => {
  const project = projects.find(p => p.slug === 'after-five');
  assert.ok(project, 'data/projects.mjs has a project with slug "after-five"');
  return project;
};

// The first group of the rail (desktop) and of the drawer (mobile) holds the
// practices; Street closes that group, right after Design.
const railGroup = html => {
  const rail = html.match(/<nav\b[^>]*class="rail"[^>]*>([\s\S]*?)<\/nav>/);
  assert.ok(rail, 'rail navigation exists');
  const group = rail[1].match(/<div class="rail-nav">([\s\S]*?)<\/div>/);
  assert.ok(group, 'rail practice group exists');
  return links(group[1]);
};
const drawerGroup = html => {
  const start = html.search(/<div\b[^>]*class="drawer"/);
  assert.ok(start >= 0, 'drawer exists');
  const group = html.slice(start).match(/<div class="group">([\s\S]*?)<\/div>/);
  assert.ok(group, 'drawer practice group exists');
  return links(group[1]);
};

before(() => {
  build();
});

test('S1: every page with the main navigation links to Street right after Design, in rail and drawer, current only on Street pages', () => {
  const pages = ['index.html', 'photo/index.html', 'video/index.html', 'design/index.html', 'aboutme/index.html',
    'street/index.html', 'street/after-five/index.html', 'work/portraits/index.html'];
  const streetPages = new Set(['street/index.html', 'street/after-five/index.html']);
  for (const prefix of PREFIXES) for (const page of pages) {
    const where = `${prefix}${page}`;
    const html = read(where);
    const p = `/${prefix}`;
    for (const [name, group] of [['rail', railGroup(html)], ['drawer', drawerGroup(html)]]) {
      assert.deepEqual(group.map(a => a.href), [p, `${p}photo/`, `${p}video/`, `${p}design/`, `${p}street/`],
        `${where} ${name}: Selected · Photography · Video · Design · Street`);
      const street = group[4];
      assert.equal(street.text, L.section[lang(prefix)], `${where} ${name}: Street label`);
      if (streetPages.has(page)) assert.equal(street['aria-current'], 'page', `${where} ${name}: Street is current`);
      else assert.ok(!('aria-current' in street), `${where} ${name}: Street is not current`);
    }
  }
});

test('S2: /street/ is the section page listing the After Five series', () => {
  for (const prefix of PREFIXES) {
    const html = read(`${prefix}street/index.html`);
    const l = lang(prefix);
    assert.doesNotMatch(html, /http-equiv="refresh"/, `${prefix}street/: a real page, not a redirect`);
    const h1 = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/);
    assert.ok(h1, `${prefix}street/: has h1`);
    assert.equal(text(h1[1]), L.section[l], `${prefix}street/: h1`);
    const eyebrow = html.match(/<p class="eyebrow">([\s\S]*?)<\/p>/);
    assert.ok(eyebrow, `${prefix}street/: has eyebrow`);
    assert.ok(text(eyebrow[1]).includes(L.ongoing[l]), `${prefix}street/: eyebrow «${L.ongoing[l]}», got «${text(eyebrow[1])}»`);
    const main = html.slice(html.indexOf('<main'));
    assert.ok(links(main).some(a => a.href === `/${prefix}street/after-five/`), `${prefix}street/: links to the series`);
    const canonical = tags(html, 'link').find(a => a.rel === 'canonical');
    assert.equal(canonical?.href, `${SITE}${prefix}street/`, `${prefix}street/: canonical`);
    assert.ok(!html.includes(L.placeholder.en) && !html.includes(L.placeholder.ua), `${prefix}street/: no placeholder copy`);
  }
});

test('S3: /street/after-five/ is the series page with its twelve-frame collage', () => {
  const project = series();
  const media = project.media.filter(m => m.type === 'image').map(m => m.src);
  assert.equal(media.length, 12, 'the series has twelve frames');
  for (const prefix of PREFIXES) {
    const where = `${prefix}street/after-five/`;
    const html = read(`${where}index.html`);
    const l = lang(prefix);
    assert.doesNotMatch(html, /http-equiv="refresh"/, `${where}: a real page, not a redirect`);
    const h1 = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/);
    assert.ok(h1, `${where}: has h1`);
    assert.equal(text(h1[1]), L.series[l], `${where}: h1`);
    const canonical = tags(html, 'link').find(a => a.rel === 'canonical');
    assert.equal(canonical?.href, `${SITE}${where}`, `${where}: canonical`);

    const opening = [...html.matchAll(/<div\b[^>]*>/g)].find(m => attrs(m[0]).id === 'gallery-after-five');
    assert.ok(opening, `${where}: collage #gallery-after-five exists`);
    const container = attrs(opening[0]);
    assert.ok(hasClass(container, 'collage'), `${where}: container is a collage`);
    assert.equal(container['data-lb-group'], 'after-five', `${where}: lightbox group`);
    const body = html.slice(opening.index + opening[0].length).split('</div>')[0];
    const hrefs = links(body).map(a => a.href);
    assert.deepEqual(hrefs, media, `${where}: twelve frames in source order`);

    const eyebrow = html.match(/<p class="eyebrow">([\s\S]*?)<\/p>/);
    assert.ok(eyebrow, `${where}: has eyebrow`);
    assert.ok(!text(eyebrow[1]).includes(L.ongoing[l]), `${where}: eyebrow does not repeat «${L.ongoing[l]}»`);
    const facts = html.match(/<dl class="facts">([\s\S]*?)<\/dl>/);
    assert.ok(facts, `${where}: has facts`);
    assert.ok([...facts[1].matchAll(/<dd>([\s\S]*?)<\/dd>/g)].some(m => text(m[1]) === '2025–2026'), `${where}: year 2025–2026 in facts`);
  }
});

test('S4: home keeps the series as the eighth Selected row and in the persistent collage', () => {
  for (const prefix of PREFIXES) {
    const html = read(`${prefix}index.html`);
    const target = `/${prefix}street/after-five/`;
    const rows = [...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)].filter(m => hasClass(attrs(m[1]), 'row'));
    assert.ok(rows.length >= 8, `${prefix}index.html: at least eight rows`);
    const eighth = rows[7];
    assert.equal(attrs(eighth[1]).href, target, `${prefix}index.html: eighth row links to the series`);
    const title = eighth[2].match(/<span class="row-title">([\s\S]*?)<\/span>/);
    assert.ok(title, `${prefix}index.html: eighth row has a title`);
    assert.equal(text(title[1]), L.series[lang(prefix)], `${prefix}index.html: eighth row title`);
    assert.ok(tags(html, 'a').some(a => hasClass(a, 'collage-tile') && a.href === target), `${prefix}index.html: a collage tile links to the series`);
  }
});

test('S5: the Photography hub does not list the street series', () => {
  for (const prefix of PREFIXES) {
    const html = read(`${prefix}photo/index.html`);
    const stray = tags(html, 'a').map(a => a.href || '').filter(h => /\/street\/after-five\/|\/work\/street\//.test(h));
    assert.deepEqual(stray, [], `${prefix}photo/: no link to the street series`);
  }
});

test('S6: the old /work/street/ address redirects to the series; no /work/after-five/ page', () => {
  for (const prefix of PREFIXES) {
    const path = `${prefix}work/street/index.html`;
    assert.ok(existsSync(resolve(root, path)), `${path}: exists`);
    const html = read(path);
    const to = `/${prefix}street/after-five/`;
    // Same shape as the other legacy redirects (e.g. photo/reportage/).
    const canonical = tags(html, 'link').find(a => a.rel === 'canonical');
    assert.equal(canonical?.href, `${SITE}${prefix}street/after-five/`, `${path}: canonical points at the series`);
    const refresh = tags(html, 'meta').find(a => a['http-equiv'] === 'refresh');
    assert.equal(refresh?.content, `0; url=${to}`, `${path}: meta refresh`);
    const body = html.match(/<body>([\s\S]*?)<\/body>/);
    assert.ok(body, `${path}: has body`);
    assert.deepEqual(links(body[1]).map(a => a.href), [to], `${path}: body links to the series`);
    assert.doesNotMatch(html, /class="collage"|<main\b/, `${path}: a redirect, not a page`);
    assert.ok(!existsSync(resolve(root, `${prefix}work/after-five/index.html`)), `${prefix}work/after-five/: must not exist`);
  }
});

test('S7: sitemap lists the section and the series in both languages, not the old address', () => {
  const xml = read('sitemap.xml');
  const locs = [...xml.matchAll(/<loc>([^<]*)<\/loc>/g)].map(m => m[1]);
  for (const url of [`${SITE}street/`, `${SITE}street/after-five/`, `${SITE}ua/street/`, `${SITE}ua/street/after-five/`]) {
    assert.ok(locs.includes(url), `sitemap: ${url}`);
  }
  assert.ok(!xml.includes(`${SITE}work/street/`), 'sitemap: no /work/street/');
  assert.ok(!xml.includes(`${SITE}ua/work/street/`), 'sitemap: no /ua/work/street/');
  assert.ok(!xml.includes(`${SITE}work/after-five/`) && !xml.includes(`${SITE}ua/work/after-five/`), 'sitemap: no /work/after-five/');
});

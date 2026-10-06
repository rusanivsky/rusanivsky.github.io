import test, { before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { projects } from '../data/projects.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = path => readFileSync(resolve(root, path), 'utf8');
const hash = text => createHash('sha256').update(text).digest('hex');
const dimensions = JSON.parse(read('data/media-sizes.json'));
const photoProjects = projects.filter(p => p.disciplines.includes('photography'));
// A project page lives under its section: the street series under /street/, the rest under /work/.
const pagePath = p => (p.section === 'street' ? 'street/' : 'work/') + p.slug + '/';
const decode = s => s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const attrs = tag => Object.fromEntries([...tag.matchAll(/([\w:-]+)(?:="([^"]*)")?/g)].map(m => [m[1], decode(m[2] ?? '')]));
const tags = (html, name) => [...html.matchAll(new RegExp(`<${name}\\b[^>]*>`, 'g'))].map(m => attrs(m[0]));
const hasClass = (a, cls) => (a.class || '').split(/\s+/).includes(cls);
const generated = () => {
  const files = [];
  function walk(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith('.') || ['node_modules', 'media'].includes(entry.name)) continue;
      const path = resolve(dir, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (/\.html$/.test(entry.name) || ['CNAME', 'robots.txt', 'sitemap.xml'].includes(entry.name)) files.push(relative(root, path));
    }
  }
  walk(root);
  return Object.fromEntries(files.sort().map(path => [path, hash(read(path))]));
};
const build = () => execFileSync(process.execPath, ['scripts/build.mjs'], { cwd: root, env: { ...process.env, SITE_ENV: 'live' }, stdio: 'pipe' });
let firstBuild;
before(() => {
  const protectedPaths = ['data/projects.mjs', 'data/photo-sequences.json', 'data/media-sizes.json', 'data/media-ladder.json'];
  const originals = protectedPaths.map(p => hash(read(p)));
  build();
  firstBuild = generated();
  build();
  assert.deepEqual(generated(), firstBuild, 'two live builds produce identical output');
  assert.deepEqual(protectedPaths.map(p => hash(read(p))), originals, 'build cannot mutate project/photo source data');
});

test('every photographic series preserves all native images, alt text, order and lightbox grouping in EN and UA', () => {
  for (const project of photoProjects) for (const prefix of ['', 'ua/']) {
    const html = read(`${prefix}${pagePath(project)}index.html`);
    const opening = [...html.matchAll(/<div\b[^>]*>/g)].find(m => hasClass(attrs(m[0]), 'collage'));
    assert.ok(opening, `${prefix}${project.slug}: gallery exists`);
    const container = attrs(opening[0]);
    assert.ok('data-gallery' in container, 'progressive gallery hook');
    assert.equal(container['data-lb-group'], project.slug, 'stable lightbox group');
    assert.ok(!/position\s*:\s*absolute|height\s*:/.test(container.style || ''), 'server markup does not depend on JS coordinates');
    const body = html.slice(opening.index + opening[0].length).split('</div>')[0];
    assert.doesNotMatch(body, /<figcaption\b/);
    const anchors = [...body.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)];
    assert.equal(body.replace(/<a\b[^>]*>[\s\S]*?<\/a>/g, '').trim(), '', 'cells are direct children');
    const media = project.media.filter(m => m.type === 'image');
    assert.deepEqual(anchors.map(m => attrs(m[1]).href), media.map(m => m.src), `${project.slug}: source ordering`);
    anchors.forEach((match, i) => {
      const a = attrs(match[1]);
      assert.ok(hasClass(a, 'cell') && 'data-lb' in a);
      const images = tags(match[2], 'img');
      assert.equal(images.length, 1);
      const image = images[0];
      assert.equal(image.alt, media[i].alt);
      assert.equal(Number(image.width), dimensions[media[i].src].w);
      assert.equal(Number(image.height), dimensions[media[i].src].h);
      assert.ok(!/position\s*:\s*absolute|transform\s*:/.test(a.style || ''));
    });
    const canonical = tags(html, 'link').find(a => a.rel === 'canonical');
    assert.equal(canonical.href, `https://rusanivsky.com/${prefix}${pagePath(project)}`);
  }
});

test('photographic galleries render directly in the series layout without a view switch', () => {
  for (const project of photoProjects) {
    for (const prefix of ['', 'ua/']) {
      const html = read(`${prefix}${pagePath(project)}index.html`);
      assert.doesNotMatch(html, /data-gallery-mode|data-gallery-controls/);
      assert.match(html, new RegExp(`id="gallery-${project.slug}" class="collage" data-gallery`));
    }
  }
});

test('home and photographic pages load the versioned layout before site code', () => {
  const version = createHash('sha1').update(read('scripts/gallery-layout.js')).digest('hex').slice(0, 8);
  for (const prefix of ['', 'ua/']) for (const path of ['index.html', ...photoProjects.map(p => `${pagePath(p)}index.html`)]) {
    const scripts = tags(read(prefix + path), 'script').map(a => a.src).filter(Boolean);
    const layout = scripts.indexOf(`/scripts/gallery-layout.js?v=${version}`);
    const site = scripts.findIndex(src => /^\/scripts\/site\.js\?v=/.test(src));
    assert.ok(layout >= 0 && site > layout, `${prefix}${path}: dependency load order`);
  }
});

test('live build output is present and uses the production host', () => {
  assert.ok(Object.keys(firstBuild).length > 20);
  assert.equal(read('CNAME').trim(), 'rusanivsky.com');
  assert.doesNotMatch(read('sitemap.xml'), /test\.rusanivsky\.com/);
});

test('concert photographs belong to Culture & art without separate photo projects', () => {
  const culture = projects.find(p => p.slug === 'culture-and-art');
  const photos = culture.media.filter(m => m.type === 'image').map(m => m.src);
  // Accepted curation, winter portrait moves and two requested culture removals.
  assert.equal(photos.length, 99);
  assert.ok(photos.includes('/media/photo/art-events/20251002-180031-A.webp'));
  assert.equal(new Set(photos).size, photos.length);
  const concerts = { 'wordmusic-autumn': 16, 'wordmusic-winter': 1, 'wordmusic-roads': 29, 'wordmusic-christmas': 3 };
  for (const [folder, count] of Object.entries(concerts)) {
    assert.equal(photos.filter(src => src.startsWith(`/media/photo/${folder}/`)).length, count,
      `${folder}: expected photographs retained in Culture & art`);
    assert.ok(!projects.some(p => p.slug === folder), `${folder}: no separate photo project`);
  }
  for (const prefix of ['', 'ua/']) {
    const index = read(`${prefix}photo/index.html`);
    assert.doesNotMatch(index, /word&amp;music · Concert series|word&amp;music · Концертні серії/);
    for (const slug of Object.keys(concerts)) {
      const legacy = read(`${prefix}work/${slug}/index.html`);
      assert.match(legacy, new RegExp(`/${prefix}work/culture-and-art/`), `${prefix}${slug}: redirects to genre`);
    }
  }
});

test('the twelve requested winter portraits move to Portraits while the group stays in Culture & art', () => {
  const culture = projects.find(p => p.slug === 'culture-and-art');
  const portraits = projects.find(p => p.slug === 'portraits');
  const moved = [
    ...['191416', '192635', '182940', '185125', '182246', '184821', '185442', '190049', '190936']
      .map(time => `20231222-${time}-A.webp`),
    ...['154436', '154746', '154957'].map(time => `20231225-${time}-A.webp`),
  ].map(name => `/media/photo/wordmusic-winter/${name}`);
  for (const src of moved) {
    assert.equal(portraits.media.filter(m => m.src === src).length, 1, `${src}: exactly once in Portraits`);
    assert.ok(!culture.media.some(m => m.src === src), `${src}: absent from Culture & art`);
    for (const prefix of ['', 'ua/']) {
      assert.ok(read(`${prefix}work/portraits/index.html`).includes(src), `${prefix}${src}: portrait page`);
      assert.ok(!read(`${prefix}work/culture-and-art/index.html`).includes(src), `${prefix}${src}: absent from culture page`);
    }
  }
  const group = '/media/photo/wordmusic-winter/20231225-153923-A.webp';
  assert.equal(culture.media.filter(m => m.src === group).length, 1);
  assert.ok(!portraits.media.some(m => m.src === group));
});

test('requested gallery removals preserve media and the two event frames move to Reportage', () => {
  const removed = [
    '/media/photo/wordmusic-roads/20240608-162236-A.webp',
    '/media/photo/wordmusic-christmas/20241221-160714-A.webp',
    '/media/photo/photo-sessions/20240913-132705-A.webp',
    '/media/photo/photo-sessions/20241202-190925-A.webp',
  ];
  for (const src of removed) {
    assert.ok(existsSync(resolve(root, src.slice(1))), `${src}: media preserved`);
    for (const project of photoProjects) {
      assert.ok(!project.media.some(m => m.src === src), `${src}: absent from ${project.slug}`);
      for (const prefix of ['', 'ua/']) {
        assert.ok(!read(`${prefix}${pagePath(project)}index.html`).includes(src), `${prefix}${src}: absent from gallery output`);
      }
    }
  }
  const portraits = projects.find(p => p.slug === 'portraits');
  const reportage = projects.find(p => p.slug === 'reportage');
  for (const name of ['20200709_192730_Master.webp', '20200709_191436_Master.webp']) {
    const src = `/media/photo/photo-sessions/${name}`;
    assert.equal(reportage.media.filter(m => m.src === src).length, 1, `${src}: exactly once in Reportage`);
    assert.ok(!portraits.media.some(m => m.src === src), `${src}: absent from Portraits`);
    assert.ok(existsSync(resolve(root, src.slice(1))), `${src}: media preserved`);
    for (const prefix of ['', 'ua/']) {
      assert.ok(read(`${prefix}work/reportage/index.html`).includes(src));
      assert.ok(!read(`${prefix}work/portraits/index.html`).includes(src));
    }
  }
  assert.equal(portraits.media.filter(m => m.type === 'image').length, 47);
  assert.equal(reportage.media.filter(m => m.type === 'image').length, 83);
});

test('reportage preview shows the graduates and the couple belongs to Portraits', () => {
  const graduates = '/media/photo/public-events/20260628-140704-A.webp';
  const couple = '/media/photo/public-events/20260709-172211-A.webp';
  const reportage = projects.find(p => p.slug === 'reportage');
  const portraits = projects.find(p => p.slug === 'portraits');
  const hints = JSON.parse(read('data/gallery-layout.json'));
  assert.equal(reportage.cover, graduates);
  assert.equal(hints.reportage.stage[0], graduates);
  assert.ok(!reportage.media.some(m => m.src === couple));
  assert.equal(portraits.media.filter(m => m.src === couple).length, 1);
  for (const prefix of ['', 'ua/']) {
    const home = read(`${prefix}index.html`);
    assert.match(home, new RegExp(graduates));
    assert.doesNotMatch(read(`${prefix}work/reportage/index.html`), new RegExp(couple));
    assert.match(read(`${prefix}work/portraits/index.html`), new RegExp(couple));
  }
});


// Keep author data byte-for-byte intact even when a regression assertion fails.
function withHints(hints, verify) {
  const path = resolve(root, 'data/gallery-layout.json');
  const original = readFileSync(path);
  const outputBefore = generated();
  try {
    writeFileSync(path, JSON.stringify(hints));
    build();
    verify();
  } finally {
    writeFileSync(path, original);
    build();
    assert.deepEqual(readFileSync(path), original, 'author config restored');
    assert.deepEqual(generated(), outputBefore, 'generated pages restored after hint fixture');
  }
}

test('malformed optional hero hints cannot abort a live build', () => {
  const project = photoProjects.find(p => p.featured);
  withHints({ [project.slug]: { hero: {} } }, () => {
    for (const prefix of ['', 'ua/']) {
      const html = read(`${prefix}${pagePath(project)}index.html`);
      assert.equal(tags(html, 'a').filter(a => 'data-lb' in a).length, project.media.filter(m => m.type === 'image').length);
      assert.doesNotMatch(html, /data-gallery-hero/);
    }
  });
});

test('a stale stage hint is replaced so the persistent collage keeps valid authored project photos', () => {
  const project = photoProjects.find(p => p.featured && p.media.length >= 3);
  const valid = project.media.filter(m => m.type === 'image').slice(0, 2).map(m => m.src);
  withHints({ [project.slug]: { stage: [valid[0], '/media/photo/no-longer-present.webp', valid[1]] } }, () => {
    for (const prefix of ['', 'ua/']) {
      const html = read(prefix + 'index.html');
      const mosaic = [...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)].filter(m => {
        const a = attrs(m[1]);
        return hasClass(a, 'collage-tile') && a.href === `/${prefix}${pagePath(project)}`;
      });
      assert.ok(mosaic.length >= 2, 'project retains at least two photographic tiles');
      const sources = mosaic.flatMap(m => tags(m[2], 'img').map(a => a.src));
      assert.ok(sources.length >= 2, 'invalid hint must not shrink the collage selection');
      assert.equal(new Set(sources).size, sources.length, 'fallback uses distinct photographs');
      assert.ok(valid.every(src => sources.includes(src)), 'valid authored selections are preserved across layout columns');
      assert.ok(sources.every(src => project.media.some(m => m.src === src)), 'only this project supplies the fallback');
    }
  });
});

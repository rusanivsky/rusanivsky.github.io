import test, { before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
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
    const html = read(`${prefix}work/${project.slug}/index.html`);
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
    assert.equal(canonical.href, `https://rusanivsky.com/${prefix}work/${project.slug}/`);
  }
});

test('photographic galleries render directly in the series layout without a view switch', () => {
  for (const project of photoProjects) {
    for (const prefix of ['', 'ua/']) {
      const html = read(`${prefix}work/${project.slug}/index.html`);
      assert.doesNotMatch(html, /data-gallery-mode|data-gallery-controls/);
      assert.match(html, new RegExp(`id="gallery-${project.slug}" class="collage" data-gallery`));
    }
  }
});

test('home and photographic pages load the versioned layout before site code', () => {
  const version = createHash('sha1').update(read('scripts/gallery-layout.js')).digest('hex').slice(0, 8);
  for (const prefix of ['', 'ua/']) for (const path of ['index.html', ...photoProjects.map(p => `work/${p.slug}/index.html`)]) {
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
  assert.equal(photos.length, 112);
  assert.equal(new Set(photos).size, photos.length);
  const concerts = { 'wordmusic-autumn': 16, 'wordmusic-winter': 13, 'wordmusic-roads': 30, 'wordmusic-christmas': 4 };
  for (const [folder, count] of Object.entries(concerts)) {
    assert.equal(photos.filter(src => src.startsWith(`/media/photo/${folder}/`)).length, count,
      `${folder}: every photograph included in Culture & art`);
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
      const html = read(`${prefix}work/${project.slug}/index.html`);
      assert.equal(tags(html, 'a').filter(a => 'data-lb' in a).length, project.media.filter(m => m.type === 'image').length);
      assert.doesNotMatch(html, /data-gallery-hero/);
    }
  });
});

test('a stale stage hint is replaced so a three-frame home preview stays complete', () => {
  const project = photoProjects.find(p => p.featured && p.media.length >= 3);
  const valid = project.media.filter(m => m.type === 'image').slice(0, 2).map(m => m.src);
  withHints({ [project.slug]: { stage: [valid[0], '/media/photo/no-longer-present.webp', valid[1]] } }, () => {
    for (const prefix of ['', 'ua/']) {
      const html = read(prefix + 'index.html');
      const mosaic = [...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)].find(m => {
        const a = attrs(m[1]);
        return hasClass(a, 'mosaic') && a.href === `/${prefix}work/${project.slug}/`;
      });
      assert.ok(mosaic, 'photographic homepage preview exists');
      const sources = tags(mosaic[2], 'img').map(a => a.src);
      assert.equal(sources.length, 3, 'invalid hint must not shrink the three-frame preview');
      assert.equal(new Set(sources).size, 3, 'fallback uses distinct photographs');
      assert.deepEqual(sources.slice(0, 2), valid, 'valid authored selections retain their order');
      assert.ok(sources.every(src => project.media.some(m => m.src === src)), 'only this project supplies the fallback');
    }
  });
});

// Run after: SITE_ENV=live node scripts/build.mjs
// Selection and attribution acceptance criteria, independent of the generator.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const expectedIds = [
  '40712ef215b2', '7c98b1359e9e', '5b70438df6b6',
  '87c97e70206f', 'd680b2424333', 'c74bada85c56',
  '0bf33a880b88', '7adbc7e08f43', '5b266bfe71d2', '11c63790dd0d',
  '89b3b10030a9', '1e5529bde6ae', 'dbe7e36d8ba9', 'e637be5d0d55',
  '01becb12cc1c',
];
const executionIds = ['c74bada85c56',
  '0bf33a880b88', '7adbc7e08f43', '5b266bfe71d2', '89b3b10030a9'];
const read = path => readFileSync(resolve(root, path), 'utf8');
const text = html => html.replace(/<[^>]*>/g, ' ').replace(/&nbsp;|&#160;/g, ' ')
  .replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const page = (p, lang) => read(`${lang === 'ua' ? 'ua/' : ''}work/${p.slug}/index.html`);
const privateSource = /(?:file:\/\/|\/Users\/|\/private\/|fsprivate|KR\/Production\/|drive\.google\.com|work\/source\/)/i;
const localImage = src => {
  assert.equal(typeof src, 'string');
  assert.match(src, /^\/media\//, `local public image: ${src}`);
  const path = resolve(root, decodeURIComponent(src.split(/[?#]/)[0]).slice(1));
  assert.ok(!relative(root, path).startsWith('..'), 'image stays in repository');
  assert.ok(existsSync(path) && statSync(path).isFile() && statSync(path).size > 0, `image exists: ${src}`);
};

test('selected design cases satisfy the publication contract', async t => {
  assert.ok(existsSync(resolve(root, 'data/design-projects.json')), 'data/design-projects.json must exist');
  const projects = JSON.parse(read('data/design-projects.json'));
  const find = id => {
    const project = projects.find(p => p.selectedIds?.includes(id));
    assert.ok(project, `selection ${id} has a case`);
    return project;
  };

  await t.test('12 cases account for exactly the 15 currently approved entries', () => {
    assert.ok(Array.isArray(projects));
    assert.equal(projects.length, 12);
    assert.equal(new Set(projects.map(p => p.slug)).size, 12, 'unique case routes');
    for (const p of projects) assert.ok(Array.isArray(p.selectedIds) && p.selectedIds.length, `${p.slug}: selection mapping`);
    const ids = projects.flatMap(p => p.selectedIds);
    assert.equal(new Set(ids).size, ids.length, 'no selection duplicated across cases');
    assert.deepEqual([...ids].sort(), [...expectedIds].sort(), 'no selected work lost or unselected work added');
    assert.doesNotMatch(JSON.stringify(projects), /diame/i);
  });

  await t.test('word&music design does not replace the existing concert-video project', async () => {
    const { projects: combined } = await import('../data/projects.mjs');
    const video = combined.find(p => p.slug === 'word-and-music');
    assert.ok(video, 'established concert-video route survives');
    assert.equal(video.id, 'p-word-and-music');
    assert.deepEqual(video.disciplines, ['video']);
    assert.deepEqual(video.roles, ['Producing', 'Camera', 'Editing']);
    assert.equal(video.media.length, 5);
    assert.ok(video.media.every(m => m.type === 'video'));
    const design = find('40712ef215b2');
    assert.notEqual(design.slug, video.slug, 'design has its own route');
    assert.notEqual(design.id, video.id, 'design has its own stable identity');
  });

  await t.test('bilingual pages and original public image assets exist without private source leakage', () => {
    assert.doesNotMatch(JSON.stringify(projects), privateSource);
    for (const p of projects) {
      localImage(p.cover);
      assert.ok(p.media?.length, `${p.slug}: visual sequence`);
      for (const m of p.media) {
        assert.equal(m.type, 'image', `${p.slug}: design images`);
        localImage(m.src);
      }
      for (const lang of ['ua', 'en']) {
        assert.ok(p.title?.[lang]?.trim(), `${p.slug}: ${lang} title`);
        assert.ok(p.scopeRole?.[lang]?.trim(), `${p.slug}: ${lang} role`);
        const html = page(p, lang);
        assert.doesNotMatch(html, privateSource, `${p.slug}: ${lang} private source leakage`);
        assert.doesNotMatch(html, /diame/i);
        assert.ok(text(html).includes(p.scopeRole[lang]), `${p.slug}: ${lang} precise role visible`);
        const imageRefs = [...html.matchAll(/<img\b[^>]*\bsrc="([^"]+)"/g)].map(m => m[1]);
        assert.ok(imageRefs.length, `${p.slug}: ${lang} rendered images`);
        for (const src of imageRefs) if (src.startsWith('/media/')) localImage(src);
        for (const m of p.media) assert.ok(html.includes(m.src), `${p.slug}: ${lang} selected image rendered: ${m.src}`);
      }
    }
  });

  await t.test('saved execution choices remain explicit in both languages', () => {
    for (const p of projects) {
      const expected = p.selectedIds.some(id => executionIds.includes(id));
      assert.equal(p.execution, expected, `${p.slug}: saved attribution choice`);
      if (expected) {
        assert.match(text(page(p, 'ua')), /Виконавча робота/);
        assert.match(text(page(p, 'en')), /Execution work/);
      }
    }
  });

  await t.test('excluded Cozy and deferred Maaaam have no data, index links, sitemap entries or pages', async () => {
    const excluded = /acb2dcb283ad|a4c0f97b350b|very-cozy-book|very\s+cozy\s+book|дуже\s+затишна\s+книга|maaaaaaam|ма{3,}м/i;
    assert.doesNotMatch(JSON.stringify(projects), excluded);
    const { projects: combined } = await import('../data/projects.mjs');
    // Existing video work can mention these books; only their design cases are excluded.
    assert.doesNotMatch(JSON.stringify(combined.map(p => ({ id: p.id, slug: p.slug, title: p.title, selectedIds: p.selectedIds }))), excluded);
    for (const prefix of ['', 'ua/']) {
      for (const index of ['index.html', 'design/index.html']) {
        assert.doesNotMatch(read(prefix + index), excluded, `${prefix}${index}: excluded case absent`);
      }
      for (const slug of ['very-cozy-book', 'maaaaaaam']) {
        assert.ok(!existsSync(resolve(root, `${prefix}work/${slug}/index.html`)), `${prefix}${slug}: unpublished case page removed`);
      }
    }
    assert.doesNotMatch(read('sitemap.xml'), excluded);
  });

  await t.test('existential-war case is cover design only', () => {
    const p = find('d680b2424333');
    assert.match(p.scopeRole.ua, /обкладинк/i);
    assert.match(p.scopeRole.en, /cover/i);
    assert.doesNotMatch(JSON.stringify([p.roles, p.scopeRole]), /layout|typesetting|верстк|блок/i);
  });

  await t.test('history series retains its route and distinguishes both selected editions', () => {
    const p = find('dbe7e36d8ba9');
    assert.equal(p.slug, 'history-of-ukraine-2020');
    assert.ok(p.selectedIds.includes('87c97e70206f'));
    assert.ok(p.year == null || p.year === '', 'publication 2024 does not date the whole series');
    for (const lang of ['ua', 'en']) {
      for (const year of ['2020', '2022']) {
        assert.ok(p.media.some(m => m.caption?.[lang]?.includes(year)), `${lang}: ${year} edition has an image caption`);
        const captions = [...page(p, lang).matchAll(/<figcaption\b[^>]*>([\s\S]*?)<\/figcaption>/g)].map(m => text(m[1]));
        assert.ok(captions.some(c => c.includes(year)), `${lang}: ${year} caption reaches the page`);
      }
    }
  });

  await t.test('three published routes retain their Behance references', () => {
    for (const [id, slug] of [['dbe7e36d8ba9', 'history-of-ukraine-2020'],
      ['e637be5d0d55', 'historical-shevchenkiana'], ['01becb12cc1c', 'chornobyl-35']]) {
      const p = find(id);
      assert.equal(p.slug, slug);
      assert.ok(p.externalLinks?.some(link => /^https:\/\/(?:www\.)?behance\.net\//.test(link.href)), `${slug}: retained Behance reference`);
      for (const lang of ['ua', 'en']) assert.match(page(p, lang), /https:\/\/(?:www\.)?behance\.net\//);
    }
  });
});

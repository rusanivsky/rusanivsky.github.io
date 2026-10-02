const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { compose, composeStage } = require('../scripts/gallery-layout.js');

const EPS = 1e-6;
const close = (a, b, message) => assert.ok(Math.abs(a - b) < EPS, `${message}: ${a} vs ${b}`);
const photos = (count, kind = 'mixed') => Array.from({ length: count }, (_, i) => {
  const ratios = kind === 'portraits' ? [0.5, 2 / 3, 0.8] : kind === 'panoramas' ? [3, 4, 5] : [1.5, 2 / 3, 1, 16 / 9, 0.5, 2.4];
  return { n: `frame-${i + 11}`, w: ratios[i % ratios.length] * 1200, h: 1200 };
});
function geometry(result, input, width, gap, stage = false) {
  assert.deepEqual(result.tiles.map(t => t.n), input.map(p => p.n), 'preserve every ID and source order');
  if (!stage) assert.ok(Array.isArray(result.breaks));
  assert.ok(Number.isFinite(result.height) && result.height > 0);
  result.tiles.forEach((t, i) => {
    for (const key of ['x', 'y', 'w', 'h']) assert.ok(Number.isFinite(t[key]), `${key} must be finite`);
    assert.ok(t.x >= -EPS && t.y >= -EPS && t.w > 0 && t.h > 0);
    assert.ok(t.x + t.w <= width + EPS && t.y + t.h <= result.height + EPS, 'tile within canvas');
    close(t.w / t.h, input[i].w / input[i].h, 'native ratio');
    result.tiles.slice(i + 1).forEach(b => assert.ok(
      t.x + t.w + gap <= b.x + EPS || b.x + b.w + gap <= t.x + EPS ||
      t.y + t.h + gap <= b.y + EPS || b.y + b.h + gap <= t.y + EPS,
      `${t.n} and ${b.n} must be separated by the gutter`));
  });
  close(result.height, Math.max(...result.tiles.map(t => t.y + t.h)), 'height ends at last tile');
}

test('native geometry, source order and gutters across responsive and adversarial sets', () => {
  for (const count of [1, 3, 12, 70, 100]) for (const kind of ['mixed', 'portraits', 'panoramas']) {
    const input = photos(count, kind);
    const before = JSON.stringify(input);
    for (const width of [350, 960, 1400]) for (const gap of [8, 10]) for (const mode of ['series', 'index']) {
      const result = compose(input, width, gap, { mode, heroIds: [] });
      geometry(result, input, width, gap);
      assert.deepEqual(result, compose(input, width, gap, { mode, heroIds: [] }), 'deterministic result');
    }
    assert.equal(JSON.stringify(input), before, 'caller data is immutable');
  }
});

test('index is dense and no taller than the series edit', () => {
  for (const kind of ['mixed', 'portraits', 'panoramas']) for (const width of [350, 960, 1400]) {
    const input = photos(70, kind);
    const index = compose(input, width, 10, { mode: 'index', heroIds: [] });
    const series = compose(input, width, 10, { mode: 'series', heroIds: [] });
    const occupied = index.tiles.reduce((sum, t) => sum + t.w * t.h, 0) / (width * index.height);
    assert.ok(occupied > 0.72, `index occupancy ${occupied} at ${width} (${kind})`);
    assert.ok(index.height <= series.height + EPS, 'index must be at least as compact as series');
  }
});

test('an explicit hero is standalone without discarding or renumbering frames', () => {
  const input = photos(12);
  const hero = input[5].n;
  const result = compose(input, 960, 10, { mode: 'series', heroIds: [hero] });
  geometry(result, input, 960, 10);
  const t = result.tiles.find(t => t.n === hero);
  assert.ok(result.tiles.every(b => b === t || b.y + b.h + 10 <= t.y + EPS || b.y >= t.y + t.h + 10 - EPS));
});

test('home stage fits one to three frames with exact native geometry', () => {
  for (const count of [1, 2, 3]) for (const kind of ['mixed', 'portraits', 'panoramas']) {
    for (const width of [350, 960, 1400]) {
      const input = photos(count, kind);
      const result = composeStage(input, width, 10);
      geometry(result, input, width, 10, true);
      close(Math.min(...result.tiles.map(t => t.x)), 0, 'stage left edge');
      close(Math.max(...result.tiles.map(t => t.x + t.w)), width, 'stage right edge');
      if (count === 2) {
        close(result.tiles[0].y, 0, 'pair starts at top');
        close(result.tiles[1].y, 0, 'pair starts at top');
        close(result.tiles[0].h, result.tiles[1].h, 'pair shares a baseline');
      }
      if (count === 1) {
        close(result.tiles[0].x, 0, 'single starts at left');
        close(result.tiles[0].y, 0, 'single starts at top');
        close(result.tiles[0].w, width, 'single uses full width');
        close(result.height, width * input[0].h / input[0].w, 'single has native height');
      }
    }
  }
});

test('a portrait at any stage position keeps the authored order and native shape', () => {
  for (const portraitIndex of [0, 1, 2]) {
    const input = Array.from({ length: 3 }, (_, i) => ({ n: `stage-${i}`, w: i === portraitIndex ? 800 : 1800, h: 1200 }));
    const result = composeStage(input, 1400, 10);
    geometry(result, input, 1400, 10, true);
    close(Math.max(...result.tiles.map(t => t.x + t.w)), 1400, 'stage fills width');
  }
});

test('the browser and Node expose the same layout contract', () => {
  const context = vm.createContext({});
  context.window = context;
  vm.runInContext(fs.readFileSync(require.resolve('../scripts/gallery-layout.js'), 'utf8'), context);
  assert.equal(typeof context.KRGallery?.compose, 'function');
  assert.equal(typeof context.KRGallery?.composeStage, 'function');
  const input = photos(12);
  assert.equal(JSON.stringify(context.KRGallery.compose(input, 960, 10, { mode: 'series', heroIds: [] })),
    JSON.stringify(compose(input, 960, 10, { mode: 'series', heroIds: [] })));
});

test('the first photo remains the dominant home-stage frame with a middle portrait', () => {
  const input = [
    { n: 1, w: 1500, h: 1000 },
    { n: 2, w: 667, h: 1000 },
    { n: 3, w: 1500, h: 1000 },
  ];
  const result = composeStage(input, 1000, 14);
  geometry(result, input, 1000, 14, true);
  const areas = result.tiles.map(t => t.w * t.h);
  assert.ok(areas[0] > areas[1] && areas[0] > areas[2], 'the first frame must be larger than both supporting frames');
});

test('a lone portrait is centered and fits a comfortable desktop viewing height', () => {
  const input = [{ n: 'only-portrait', w: 667, h: 1000 }];
  for (const mode of ['series', 'index']) {
    const result = compose(input, 960, 10, { mode, heroIds: [] });
    geometry(result, input, 960, 10);
    const tile = result.tiles[0];
    assert.ok(tile.h <= 620, 'a single portrait must fit within 620px at desktop width');
    close(tile.x + tile.w / 2, 480, 'single portrait centered');
  }
});

// This is the current published edit, not a spacing restriction on compose().
// Authors may still explicitly request adjacent heroes in other compositions.
const openingHeroes = {
  reportage: '/media/photo/public-events/20260820-192258-A.webp',
  'culture-and-art': '/media/photo/art-events/20260520-213303-A.webp',
  portraits: '/media/photo/photo-sessions/20250929-202244-A.webp',
};

test('current curated galleries retain their opening hero and separate later heroes by four ordinary photographs', async () => {
  const { projects } = await import('../data/projects.mjs');
  const hints = JSON.parse(fs.readFileSync(require.resolve('../data/gallery-layout.json'), 'utf8'));
  const violations = [];
  for (const [slug, opening] of Object.entries(openingHeroes)) {
    const project = projects.find(p => p.slug === slug);
    assert.ok(project, `${slug}: project exists`);
    const heroes = hints[slug]?.hero;
    assert.ok(Array.isArray(heroes), `${slug}: curated heroes exist`);
    assert.equal(heroes[0], opening, `${slug}: preserve the existing opening hero`);
    const sources = project.media.filter(m => m.type === 'image').map(m => m.src);
    const indices = heroes.map(src => sources.indexOf(src));
    assert.ok(indices.every(i => i >= 0), `${slug}: every hero belongs to the series`);
    for (let i = 1; i < indices.length; i++) {
      const ordinaryCount = indices[i] - indices[i - 1] - 1;
      if (ordinaryCount < 4) violations.push(`${slug}: hero indices ${indices[i - 1]} and ${indices[i]} leave ${ordinaryCount} ordinary photographs`);
    }
  }
  assert.deepEqual(violations, [], 'current curation must leave at least four ordinary photographs between heroes');
});

test('affected desktop series open with a hero followed by a group of photographs', async () => {
  const { projects } = await import('../data/projects.mjs');
  const hints = JSON.parse(fs.readFileSync(require.resolve('../data/gallery-layout.json'), 'utf8'));
  const sizes = JSON.parse(fs.readFileSync(require.resolve('../data/media-sizes.json'), 'utf8'));
  for (const slug of ['culture-and-art']) {
    const project = projects.find(p => p.slug === slug);
    const input = project.media.filter(m => m.type === 'image').map(m => ({ n: m.src, ...sizes[m.src] }));
    const result = compose(input, 960, 10, { mode: 'series', heroIds: hints[slug].hero });
    geometry(result, input, 960, 10);
    const [opening, next] = result.tiles;
    assert.equal(opening.n, openingHeroes[slug]);
    assert.ok(next.y >= opening.y + opening.h + 10 - EPS, `${slug}: opening hero stands alone`);
    assert.ok(result.tiles.slice(2).some(tile =>
      Math.min(next.y + next.h, tile.y + tile.h) - Math.max(next.y, tile.y) > EPS),
    `${slug}: the next photograph must share its vertical band with another photograph`);
  }
});

// Stage fitted to the panel's shape (audit 2026-10-02). The composition is
// chosen among native-aspect arrangements by how well its overall shape fits
// the panel, so a nearly square panel is not left two thirds empty.
const wallAspect = (r, width) => width / r.height;
const panelFill = (r, width, panel) => {
  const wall = wallAspect(r, width);
  const share = Math.min(panel / wall, wall / panel);
  return share * r.tiles.reduce((s, t) => s + t.w * t.h, 0) / (width * r.height);
};
const set = ratios => ratios.map((q, i) => ({ n: `s${i}`, w: q * 1000, h: 1000 }));
const HOME_SETS = [[1.5, 1.5, 1.5], [1.5, 2 / 3, 1.5], [4 / 3, 2 / 3, 2 / 3]];

test('stage with a panel aspect keeps native geometry, order and gutters', () => {
  for (const ratios of [...HOME_SETS, [2 / 3, 1.5, 1.5], [1.5, 1.5, 2 / 3], [3, 4, 5], [0.5, 0.6, 0.8]]) {
    for (const aspect of [0.5, 0.87, 1.05, 1.5, 2.4]) {
      const input = set(ratios);
      const r = composeStage(input, 1000, 14, { aspect });
      geometry(r, input, 1000, 14, true);
      close(Math.max(...r.tiles.map(t => t.x + t.w)), 1000, 'stage fills width');
      assert.deepEqual(r, composeStage(input, 1000, 14, { aspect }), 'deterministic');
    }
  }
});

test('three landscape frames stack under the lead in a near-square panel', () => {
  const r = composeStage(set([1.5, 1.5, 1.5]), 1000, 14, { aspect: 0.87 });
  close(r.tiles[0].x, 0, 'lead at left'); close(r.tiles[0].y, 0, 'lead on top'); close(r.tiles[0].w, 1000, 'lead spans');
  close(r.tiles[1].y, r.tiles[2].y, 'pair shares a top'); close(r.tiles[1].h, r.tiles[2].h, 'pair shares a height');
  assert.ok(r.tiles[1].x < r.tiles[2].x, 'pair keeps source order');
});

test('a wide panel keeps the lead beside the stacked pair', () => {
  const input = set([1.5, 1.5, 1.5]);
  assert.deepEqual(composeStage(input, 1000, 14, { aspect: 2.3 }), composeStage(input, 1000, 14));
});

// The 1440×900 laptop panel is ~0.87. A portrait pair under a 4:3 lead
// cannot fill a squarer panel much past 0.63–0.68 without cropping, so there
// the floor is 0.6; on laptop panels the gain over the old side-by-side wall
// (0.34–0.46 on the live site before this change) must be clear.
test('home photo stages fill most of a typical desktop panel', () => {
  for (const ratios of HOME_SETS) for (const panel of [0.85, 0.87, 0.96, 1.04]) {
    const r = composeStage(set(ratios), 1000, 14, { aspect: panel });
    const fill = panelFill(r, 1000, panel);
    const before = panelFill(composeStage(set(ratios), 1000, 14), 1000, panel);
    if (panel < 0.9) {
      assert.ok(fill >= 0.7, `${ratios} at ${panel}: fill ${fill.toFixed(2)}`);
      assert.ok(fill >= before * 1.4, `${ratios} at ${panel}: ${fill.toFixed(2)} vs ${before.toFixed(2)}`);
    } else assert.ok(fill >= 0.6, `${ratios} at ${panel}: fill ${fill.toFixed(2)}`);
  }
});

test('the chosen stage is the best panel fit among the arrangements', () => {
  for (const ratios of [...HOME_SETS, [2 / 3, 1.5, 1.5]]) for (const panel of [0.87, 1.5]) {
    const chosen = panelFill(composeStage(set(ratios), 1000, 14, { aspect: panel }), 1000, panel);
    const legacy = panelFill(composeStage(set(ratios), 1000, 14), 1000, panel);
    assert.ok(chosen >= legacy - 1e-9, `${ratios} at ${panel}: ${chosen} < legacy ${legacy}`);
  }
});

test('two landscape frames stack in a tall panel and stand side by side in a wide one', () => {
  const input = set([1.5, 1.5]);
  const tall = composeStage(input, 1000, 14, { aspect: 0.87 });
  close(tall.tiles[0].w, 1000, 'first spans'); close(tall.tiles[1].w, 1000, 'second spans');
  assert.ok(tall.tiles[1].y > tall.tiles[0].y, 'source order top to bottom');
  const wide = composeStage(input, 1000, 14, { aspect: 3 });
  close(wide.tiles[0].y, 0, 'row'); close(wide.tiles[1].y, 0, 'row');
});

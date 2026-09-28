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

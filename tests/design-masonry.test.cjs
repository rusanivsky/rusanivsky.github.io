const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const EPS = 1e-6;
const close = (a, b, label) => assert.ok(Math.abs(a - b) < EPS, `${label}: ${a} vs ${b}`);
const fixture = Array.from({ length: 19 }, (_, i) => ({
  width: [700, 1600, 1000, 2400, 500][i % 5],
  height: [1200, 900, 1000, 700, 1600][i % 5],
}));

test('design masonry preserves native ratios, gutters and shortest-column placement at every breakpoint', () => {
  const { layout } = require('../scripts/design-masonry.js');
  assert.equal(typeof layout, 'function');
  for (const width of [320, 599, 600, 850, 1099, 1100, 1600]) {
    for (const gap of [0, 12, 20]) {
      const input = structuredClone(fixture);
      const result = layout(input, width, gap);
      const columns = width < 600 ? 1 : width < 1100 ? 2 : 3;
      const columnWidth = (width - gap * (columns - 1)) / columns;
      const bottoms = Array(columns).fill(0);
      assert.equal(result.items.length, input.length, 'every source item remains present');
      result.items.forEach((item, i) => {
        for (const key of ['x', 'y', 'width', 'height']) assert.ok(Number.isFinite(item[key]), `finite ${key}`);
        assert.ok(item.width > 0 && item.height > 0 && item.x >= -EPS && item.y >= -EPS);
        close(item.width, columnWidth, 'equal column widths');
        close(item.width / item.height, input[i].width / input[i].height, 'native input ratio in source order');
        const column = Math.round(item.x / (columnWidth + gap));
        assert.ok(column >= 0 && column < columns);
        close(item.x, column * (columnWidth + gap), 'aligned column');
        close(item.y, Math.min(...bottoms), 'next card enters a shortest column');
        close(item.y, bottoms[column], 'card starts below preceding card in this column');
        bottoms[column] = item.y + item.height + gap;
        assert.ok(item.x + item.width <= width + EPS, 'no horizontal overflow');
        assert.ok(item.y + item.height <= result.height + EPS, 'container includes every card');
        for (const other of result.items.slice(i + 1)) {
          assert.ok(item.x + item.width + gap <= other.x + EPS ||
            other.x + other.width + gap <= item.x + EPS ||
            item.y + item.height + gap <= other.y + EPS ||
            other.y + other.height + gap <= item.y + EPS, 'no overlap; gutters preserved');
        }
      });
      close(result.height, Math.max(...result.items.map(item => item.y + item.height)), 'height ends at last card');
      assert.deepEqual(input, fixture, 'layout never mutates source dimensions');
      assert.deepEqual(result, layout(input, width, gap), 'layout is deterministic');
    }
  }
  assert.deepEqual(layout(fixture, 1100), layout(fixture, 1100, 20), 'default gutter is 20px');
});

test('empty design collections have zero height and no phantom cards', () => {
  const { layout } = require('../scripts/design-masonry.js');
  const result = layout([], 1000);
  assert.equal(result.height, 0);
  assert.deepEqual(result.items, []);
});

test('both design indexes opt into the uncropped gallery', () => {
  for (const prefix of ['', 'ua/']) {
    const html = read(`${prefix}design/index.html`);
    assert.match(html, /class="[^"]*\bdesign-masonry\b[^"]*"/, `${prefix}: gallery container`);
    assert.match(html, /<script\b[^>]*src="\/scripts\/design-masonry\.js(?:\?[^" ]*)?"/, `${prefix}: browser layout loaded`);
  }
});

test('design preview CSS releases the fixed crop and contains the full artwork', () => {
  const css = read('styles/site.css').replace(/\/\*[\s\S]*?\*\//g, '');
  const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)];
  const declarations = suffix => rules.filter(([, selectors]) => selectors.split(',')
    .some(selector => selector.trim() === `.design-masonry .work-cover${suffix}`))
    .map(([, , body]) => body).join(';');
  assert.match(declarations(''), /aspect-ratio\s*:\s*auto\b/, 'cover wrapper keeps native aspect ratio');
  assert.match(declarations(' img'), /object-fit\s*:\s*contain\b/, 'image never uses cover cropping');
  const hover = rules.filter(([, selectors]) => selectors.split(',').some(selector =>
    selector.includes('.design-masonry') && selector.includes('.work:hover') && /\bimg\s*$/.test(selector)))
    .map(([, , body]) => body).join(';');
  assert.match(hover, /transform\s*:\s*none\b/, 'hover cannot scale and crop the artwork');
});

/*
  Builds every icon from one source: the real Fixel KR contour in
  brand/glyph-KR.json, extracted from the woff2 the site itself serves and
  composed with the font's own advance widths and kerning.

    node scripts/make-icons.mjs

  Layout note: the two letters run side by side rather than stacked. Stacked
  they are handsomer at 180px and illegible at 16px, which is the wrong way
  round for a favicon — the small size is the one that has to work.

  Rasters are shot from the same SVG by a real browser rather than drawn a
  second time in code. Two drawings of one mark always drift, and they drift
  quietly, because nobody looks at a favicon next to the site.

  Chrome path comes from $CHROME; the default is the macOS location.
*/
import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { tmpdir } from 'node:os';
import path from 'node:path';

const run = promisify(execFile);
const root = new URL('..', import.meta.url).pathname;
const CHROME = process.env.CHROME
  ?? ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/usr/bin/google-chrome', '/usr/bin/chromium'].find((p) => existsSync(p));

const PAPER = '#f4f1e9';
const INK = '#111111';
const CHARCOAL = '#141412';
const LIGHT_INK = '#e8e5de';

const glyph = JSON.parse(readFileSync(path.join(root, 'brand/glyph-KR.json'), 'utf8'));

const BOX = 32;
/* Roughly a tenth of the box on each side. iOS rounds the corners of a home
   screen icon, so the letters must not run to the edge. */
const PAD = 3;

const gw = glyph.bounds.xMax - glyph.bounds.xMin;
const gh = glyph.bounds.yMax - glyph.bounds.yMin;
const scale = (BOX - 2 * PAD) / gw;
const tx = PAD - glyph.bounds.xMin * scale;
const ty = (BOX + gh * scale) / 2;
const transform = `translate(${tx.toFixed(3)} ${ty.toFixed(3)}) scale(${scale.toFixed(6)} -${scale.toFixed(6)})`;

const svg = (bg, fg) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${BOX} ${BOX}" width="${BOX}" height="${BOX}" role="img" aria-label="Kyrylo Rusanivsky">
  <rect width="${BOX}" height="${BOX}" fill="${bg}"/>
  <path transform="${transform}" d="${glyph.path}" fill="${fg}"/>
</svg>
`;

const light = svg(PAPER, INK);
const dark = svg(CHARCOAL, LIGHT_INK);
writeFileSync(path.join(root, 'favicon.svg'), light);
writeFileSync(path.join(root, 'favicon-dark.svg'), dark);
console.log('favicon.svg, favicon-dark.svg');

/* ---- rasters ---- */
const work = path.join(tmpdir(), 'kr-icons');
mkdirSync(work, { recursive: true });

async function shoot(svgText, size, out) {
  const page = path.join(work, `p${size}-${Math.random().toString(36).slice(2, 7)}.html`);
  writeFileSync(page, `<!doctype html><meta charset=utf-8>
<style>html,body{margin:0;padding:0}svg{display:block;width:${size}px;height:${size}px}</style>
${svgText}`);
  await run(CHROME, [
    '--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1',
    `--window-size=${size},${size}`, `--screenshot=${out}`, `file://${page}`,
  ]);
  return readFileSync(out);
}

const pngSize = (buf) => ({ w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) });

/* An .ico is a directory plus payloads; since Vista the payload may be a PNG
   as-is, which every browser in use today reads. */
function ico(pngs) {
  const head = Buffer.alloc(6);
  head.writeUInt16LE(0, 0); head.writeUInt16LE(1, 2); head.writeUInt16LE(pngs.length, 4);
  let offset = 6 + 16 * pngs.length;
  const dirs = [];
  for (const png of pngs) {
    const { w, h } = pngSize(png);
    const d = Buffer.alloc(16);
    d.writeUInt8(w >= 256 ? 0 : w, 0);
    d.writeUInt8(h >= 256 ? 0 : h, 1);
    d.writeUInt16LE(1, 4); d.writeUInt16LE(32, 6);
    d.writeUInt32LE(png.length, 8); d.writeUInt32LE(offset, 12);
    dirs.push(d);
    offset += png.length;
  }
  return Buffer.concat([head, ...dirs, ...pngs]);
}

const grab = {};
for (const [key, svgText, sizes] of [
  ['l', light, [16, 32, 48, 180, 192, 512]],
  ['d', dark, [16, 32, 180, 192, 512]],
]) {
  for (const size of sizes) {
    grab[`${key}${size}`] = await shoot(svgText, size, path.join(work, `${key}${size}.png`));
  }
}

writeFileSync(path.join(root, 'favicon.ico'), ico([grab.l16, grab.l32, grab.l48]));
writeFileSync(path.join(root, 'favicon-dark.ico'), ico([grab.d16, grab.d32]));
console.log('favicon.ico (16/32/48), favicon-dark.ico (16/32)');

/* Home screen and app library. The dark pair only reaches recent Safari;
   anything older simply keeps the light icon, which is why the light one is
   still the unqualified default. */
for (const [file, buf] of [
  ['apple-touch-icon.png', grab.l180],
  ['apple-touch-icon-dark.png', grab.d180],
  ['icon-192.png', grab.l192],
  ['icon-192-dark.png', grab.d192],
  ['icon-512.png', grab.l512],
  ['icon-512-dark.png', grab.d512],
]) writeFileSync(path.join(root, file), buf);
console.log('apple-touch-icon(+dark) 180, icon 192/512 (+dark)');

const manifest = {
  name: 'Kyrylo Rusanivsky',
  short_name: 'Rusanivsky',
  start_url: '/',
  display: 'standalone',
  background_color: PAPER,
  theme_color: PAPER,
  icons: [
    { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml' },
  ],
};
writeFileSync(path.join(root, 'site.webmanifest'), JSON.stringify(manifest, null, 2) + '\n');
console.log('site.webmanifest');

rmSync(work, { recursive: true, force: true });

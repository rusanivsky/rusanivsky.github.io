/*
  Builds every icon from one source: the real KR contour in
  brand/glyph-KR.json, extracted from a woff2 the site itself serves and
  composed with the font's own advance widths and kerning. The mark is set
  in Prata — the same face as the name on every page heading.

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
import { fileURLToPath } from 'node:url';

const run = promisify(execFile);
const root = fileURLToPath(new URL('..', import.meta.url));
const CHROME = process.env.CHROME
  ?? ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/usr/bin/google-chrome', '/usr/bin/chromium'].find((p) => existsSync(p));

const PAPER = '#f8f8f8';
const INK = '#111111';
const CHARCOAL = '#141412';
const LIGHT_INK = '#e8e5de';

const glyph = JSON.parse(readFileSync(path.join(root, 'brand/glyph-KR.json'), 'utf8'));

const BOX = 32;
/* Поле по краях. iOS заокруглює кути іконки на домашньому екрані, тож
   літери не мають доходити до краю; крім того, Prata — високонтрастна
   антиква, і її тонким штрихам потрібне повітря більше, ніж гротеску.
   Чверть пункту на око — це на 8% менші літери, ніж було. */
const PAD = 4;

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

/* The SVG is drawn into a canvas of the exact size and read back as a data
   URL, not screenshotted. A --screenshot is only as tall as the viewport, and
   headless Chrome 153 takes ~87px of --window-size for its own chrome: the
   16/32px icons came out blank and the 180px one lost its lower half. */
async function shoot(svgText, size, out) {
  const page = path.join(work, `p${size}-${Math.random().toString(36).slice(2, 7)}.html`);
  const src = `data:image/svg+xml;base64,${Buffer.from(svgText).toString('base64')}`;
  writeFileSync(page, `<!doctype html><meta charset=utf-8><pre id=out></pre>
<script>
const img = new Image();
img.onload = () => {
  const c = document.createElement('canvas');
  c.width = c.height = ${size};
  const g = c.getContext('2d');
  g.imageSmoothingQuality = 'high';
  g.drawImage(img, 0, 0, ${size}, ${size});
  document.getElementById('out').textContent = c.toDataURL('image/png');
};
img.src = ${JSON.stringify(src)};
</script>`);
  const { stdout } = await run(CHROME, [
    '--headless=new', '--disable-gpu', '--force-device-scale-factor=1',
    '--virtual-time-budget=5000', '--dump-dom', `file://${page}`,
  ], { maxBuffer: 64 << 20 });
  const m = stdout.match(/data:image\/png;base64,([A-Za-z0-9+/=]+)/);
  if (!m) throw new Error(`no raster for ${size}px`);
  const buf = Buffer.from(m[1], 'base64');
  const { w, h } = pngSize(buf);
  if (w !== size || h !== size) throw new Error(`${size}px raster came out ${w}x${h}`);
  writeFileSync(out, buf);
  return buf;
}

const pngSize = (buf) => ({ w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) });

const grab = {};
for (const [key, svgText, sizes] of [
  ['l', light, [16, 32, 48, 180, 192, 512]],
  ['d', dark, [16, 32, 180, 192, 512]],
]) {
  for (const size of sizes) {
    grab[`${key}${size}`] = await shoot(svgText, size, path.join(work, `${key}${size}.png`));
  }
}

/* Safari showed the PNG-encoded ICO as a blank tab icon. Keep the exact
   browser-rendered artwork, but wrap it in traditional BMP ICO entries. */
for (const [name, sizes] of [
  ['favicon.ico', ['l16', 'l32', 'l48']],
  ['favicon-dark.ico', ['d16', 'd32']],
]) {
  await run('python3', [
    path.join(root, 'scripts/pack-ico.py'), path.join(root, name),
    ...sizes.map((size) => path.join(work, `${size}.png`)),
  ]);
}
console.log('favicon.ico (16/32/48), favicon-dark.ico (16/32)');

/* iOS Home Screen uses one installed Web Clip icon. Keep its default dark so
   it fits the dark Home Screen; a media-qualified alternate does not switch
   an icon that has already been added. */
for (const [file, buf] of [
  ['apple-touch-icon.png', grab.d180],
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

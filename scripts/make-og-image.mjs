/* Збирає /og-image.jpg — картку, яку соцмережі показують замість
   посилання. Джерело розмітки — scripts/og-card.html; тут лише рендер.
 *
 * Чому через справжній браузер, а не малюванням у коді: картка мусить
 * стояти на тих самих шрифті, плиті й кольорах, що й сайт. Будь-яке
 * друге малювання поїде від першого, і поїде тихо — картку ніхто не
 * дивиться поруч із сайтом, доки хтось не кине посилання.
 *
 *   node scripts/make-og-image.mjs        # → og-image.jpg
 *
 * Після заміни картинки підніміть ?v= у всіх og:image і twitter:image:
 * Facebook, LinkedIn і Telegram кешують картку за URL і самі її не
 * перезабирають.
 */
import { createServer } from 'node:http';
import { readFile, unlink, stat } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';

const run = promisify(execFile);
const root = process.cwd();
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const OUT_PNG = path.join(root, '.og-image.tmp.png');
const OUT_JPG = path.join(root, 'og-image.jpg');
const W = 1200, H = 630;

const types = {
  '.html':'text/html; charset=utf-8', '.css':'text/css', '.js':'text/javascript',
  '.png':'image/png', '.jpg':'image/jpeg', '.webp':'image/webp',
  '.avif':'image/avif', '.woff2':'font/woff2',
};

/* Статика з кореня репозиторію: картці треба /photo.jpg, /img/*.png і
   обидва woff2, і всі вони лежать за абсолютними шляхами — тими самими,
   що й на сайті. */
const server = createServer(async (req, res) => {
  const rel = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '');
  const file = path.join(root, rel);
  if (!file.startsWith(root)) { res.writeHead(403).end(); return; }
  try {
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': types[path.extname(file)] ?? 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404).end();
  }
});

await new Promise(r => server.listen(0, '127.0.0.1', r));
const port = server.address().port;

try {
  /* virtual-time-budget, а не sleep: Chrome сам чекає, поки дорендериться
     шрифт і дозавантажиться портрет, і аж тоді знімає. Без нього картка
     раз на кілька прогонів виходила з системним шрифтом. */
  await run(CHROME, [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    '--force-device-scale-factor=1',
    `--window-size=${W},${H}`,
    '--virtual-time-budget=8000',
    `--screenshot=${OUT_PNG}`,
    `http://127.0.0.1:${port}/scripts/og-card.html`,
  ]);

  /* sips замість ImageMagick: він є на кожному маку і не тягне залежностей.
     82 — та сама якість, на якій знята попередня картка. */
  await run('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '82', OUT_PNG, '--out', OUT_JPG]);

  const { size } = await stat(OUT_JPG);
  console.log(`og-image.jpg: ${W}×${H}, ${(size / 1024).toFixed(0)} КБ`);
} finally {
  await unlink(OUT_PNG).catch(() => {});
  server.close();
}

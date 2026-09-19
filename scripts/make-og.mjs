/*
  Renders brand/og-card.html to /og-image.jpg at 1200x630.

    node scripts/make-og.mjs

  A local static server is needed because the card pulls the site's own fonts
  and photographs by absolute path — the same paths the site uses.

  After replacing the картинку, bump ?v= on og:image everywhere: Facebook,
  LinkedIn and Telegram cache a card by URL and will not re-fetch it.
*/
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync, rmSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';

const run = promisify(execFile);
const root = new URL('..', import.meta.url).pathname;
const CHROME = process.env.CHROME
  ?? ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/usr/bin/google-chrome', '/usr/bin/chromium'].find((p) => existsSync(p));

const W = 1200, H = 630;
const TMP = path.join(root, '.og.tmp.png');
const OUT = path.join(root, 'og-image.jpg');

const types = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp',
  '.avif': 'image/avif', '.woff2': 'font/woff2',
};

const server = createServer(async (req, res) => {
  const rel = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '');
  const file = path.join(root, rel);
  if (!file.startsWith(root)) { res.writeHead(403).end(); return; }
  try {
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': types[path.extname(file)] ?? 'application/octet-stream' });
    res.end(body);
  } catch { res.writeHead(404).end(); }
});

await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;

await run(CHROME, [
  '--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=2',
  `--window-size=${W},${H}`, `--screenshot=${TMP}`,
  `http://127.0.0.1:${port}/brand/og-card.html`,
]);
server.close();

// Chrome shot it at 2x for crisp type; sips scales it back and encodes JPEG.
await run('/usr/bin/sips', ['-z', String(H), String(W), '-s', 'format', 'jpeg',
  '-s', 'formatOptions', '84', TMP, '--out', OUT]);
rmSync(TMP, { force: true });

const { size } = await import('node:fs').then((fs) => fs.statSync(OUT));
console.log(`og-image.jpg  ${W}x${H}  ${(size / 1024).toFixed(0)} KB`);

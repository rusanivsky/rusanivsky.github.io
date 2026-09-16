import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const routes = [
  'photo/index.html',
  'photo/reportage/index.html',
  'photo/culture-art/index.html',
  'photo/backstage/index.html',
  'photo/portraits/index.html',
  'design/index.html',
  'design/covers/index.html',
  'video/index.html',
  'video/reels/index.html',
  'video/short-form/index.html',
  'video/interviewandvlogs/index.html',
  'video/music/index.html',
  'video/documentary/index.html',
];

const failures = [];
const fail = message => failures.push(message);
const criticalMediaRoutes = new Set([
  'photo/reportage/index.html',
  'photo/culture-art/index.html',
  'photo/backstage/index.html',
  'photo/portraits/index.html',
  'design/covers/index.html',
  'video/reels/index.html',
  'video/short-form/index.html',
  'video/interviewandvlogs/index.html',
  'video/music/index.html',
  'video/documentary/index.html',
]);

for (const source of routes) {
  for (const [prefix, language] of [['', 'en'], ['ua/', 'ua']]) {
    const file = prefix + source;
    const html = await readFile(path.join(root, file), 'utf8');
    if (!html.includes('/scripts/portfolio-runtime.js?v=3')) fail(`${file}: portfolio runtime missing`);
    if (!html.includes('/scripts/active-section-scroll.js?v=1')) fail(`${file}: active-section runtime missing`);
    if (/function setLang/.test(html)) fail(`${file}: duplicated inline language runtime remains`);
    if (/https:\/\/i\.(?:ytimg|vimeocdn)\.com\//.test(html)) fail(`${file}: external video thumbnail remains`);
    if (criticalMediaRoutes.has(source)) {
      const firstImage = html.match(/<img\b[^>]*>/)?.[0] ?? '';
      if (!firstImage.includes('loading="eager"') || !firstImage.includes('fetchpriority="high"')) {
        fail(`${file}: first media is not eager/high priority`);
      }
    }

    for (const match of html.matchAll(/<button class="[^"]*\bfac\b[^"]*"[^>]*>/g)) {
      if (!match[0].includes('data-aria-en=') || !match[0].includes('data-aria-ua=')) {
        fail(`${file}: video facade lacks localized aria labels`);
      }
    }

    for (const match of html.matchAll(/<img\b[^>]*data-alt-en="([^"]*)" data-alt-ua="([^"]*)"[^>]*>/g)) {
      const actual = match[0].match(/\balt="([^"]*)"/)?.[1];
      const expected = language === 'ua' ? match[2] : match[1];
      if (actual !== expected) fail(`${file}: alt does not match ${language} source`);
      if (language === 'en' && /[А-Яа-яІіЇїЄєҐґ]/.test(actual ?? '')) fail(`${file}: English alt remains Cyrillic`);
    }
    for (const match of html.matchAll(/<[^>]+data-aria-en="([^"]*)" data-aria-ua="([^"]*)"[^>]*>/g)) {
      const actual = match[0].match(/\baria-label="([^"]*)"/)?.[1];
      const expected = language === 'ua' ? match[2] : match[1];
      if (actual !== expected) fail(`${file}: aria-label does not match ${language} source`);
    }
  }
}

const sourceHtml = await Promise.all(routes.map(file => readFile(path.join(root, file), 'utf8')));
const externalThumbs = sourceHtml.join('\n').match(/https:\/\/i\.(?:ytimg|vimeocdn)\.com\//g) ?? [];
if (externalThumbs.length) fail(`${externalThumbs.length} external thumbnails remain`);
const localThumbRefs = sourceHtml.join('\n').match(/\/video\/img\/thumbs\/[^"']+\.jpg/g) ?? [];
if (new Set(localThumbRefs).size !== 41) fail(`expected 41 unique local thumbnails, found ${new Set(localThumbRefs).size}`);

const thumbDir = path.join(root, 'video', 'img', 'thumbs');
const thumbFiles = (await readdir(thumbDir)).filter(file => file.endsWith('.jpg'));
if (thumbFiles.length !== 41) fail(`expected 41 thumbnail files, found ${thumbFiles.length}`);
for (const file of thumbFiles) {
  if ((await stat(path.join(thumbDir, file))).size < 4096) fail(`${file}: thumbnail is suspiciously small`);
}

const homeCss = await readFile(path.join(root, 'styles', 'home.css'), 'utf8');
if (/:root\[data-theme="green"\]\s*\{/.test(homeCss)) fail('styles/home.css repeats the shared green theme');
if (/(^|\n)body\s*\{/.test(homeCss)) fail('styles/home.css repeats the shared body rule');
const videoCss = await readFile(path.join(root, 'video', 'video.css'), 'utf8');
if (/\.local-(?:fac|play)|\.v video/.test(videoCss)) fail('video/video.css contains obsolete local-player rules');
const portfolioRuntime = await readFile(path.join(root, 'scripts', 'portfolio-runtime.js'), 'utf8');
if (!/\^\(\?:\\\/ua\)\?\\\/video/.test(portfolioRuntime)) fail('player policy is not tied to the video route');
const languageSwitcher = await readFile(path.join(root, 'scripts', 'language-switcher.js'), 'utf8');
if (!/MutationObserver\(sync\)/.test(languageSwitcher)) fail('language switcher does not observe initial runtime language changes');
const fontSwitcher = await readFile(path.join(root, 'scripts', 'font-switcher.js'), 'utf8');
if (!/localStorage\.setItem\(storageKey/.test(fontSwitcher)) fail('font switcher does not persist its selection');
for (const source of ['index.html', 'rates/index.html', 'contacts/index.html', 'privacy/index.html', ...routes]) {
  for (const prefix of ['', 'ua/']) {
    const file = prefix + source;
    const html = await readFile(path.join(root, file), 'utf8');
    if (!html.includes('data-font-boot')) fail(`${file}: font choice is not applied before first paint`);
    if (!html.includes('/scripts/font-switcher.js?v=1')) fail(`${file}: font switcher runtime is missing`);
  }
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log('Portfolio audit contract passed: localized media labels, shared runtimes, local thumbnails, and CSS ownership.');

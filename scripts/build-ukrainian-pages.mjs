import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const pages = [
  ['/', 'index.html', 'Кирило Русанівський — графічний дизайнер, відеомонтажер і фотограф', 'Кирило Русанівський — графічний дизайнер, відеомонтажер і фотограф із Києва. Дизайн книжок і обкладинок, верстка, монтаж відео, репортажна та портретна фотографія.'],
  ['/rates/', 'rates/index.html', 'Умови співпраці — Кирило Русанівський', 'Умови роботи та контакти Кирила Русанівського — графічного дизайнера, відеомонтажера і фотографа з Києва.'],
  ['/contacts/', 'contacts/index.html', 'Контакти — Кирило Русанівський', 'Контакти Кирила Русанівського — графічного дизайнера, відеомонтажера і фотографа з Києва.'],
  ['/video/', 'video/index.html', 'Відеомонтаж — Кирило Русанівський', 'Портфоліо відеомонтажера з Києва Кирила Русанівського: інтерв’ю, YouTube-серії, музичні кліпи, документальні фільми, влоги та відео для соцмереж.'],
  ['/video/reels/', 'video/reels/index.html', 'Reels — Кирило Русанівський', 'Монтаж Reels у Києві: вертикальні відео для Instagram, TikTok і YouTube Shorts.'],
  ['/video/interviewandvlogs/', 'video/interviewandvlogs/index.html', 'Інтерв’ю і влоги — Кирило Русанівський', 'Зйомка й монтаж інтерв’ю та влогів у Києві: розмовні відео, YouTube-контент і соціальні мережі.'],
  ['/video/music/', 'video/music/index.html', 'Музичні кліпи — Кирило Русанівський', 'Портфоліо зі зйомки та монтажу музичних кліпів Кирила Русанівського: творчі відео для музикантів, артистів, релізів і живих виступів.'],
  ['/video/documentary/', 'video/documentary/index.html', 'Документалістика — Кирило Русанівський', 'Документальні фільми та відеомонтаж у Києві: історії людей, культурні проєкти, інтерв’ю та спостережне відео.'],
  ['/video/short-form/', 'video/short-form/index.html', 'Короткі відео — Кирило Русанівський', 'Монтаж коротких відео для соціальних мереж: вертикальні ролики для Instagram Reels, TikTok і YouTube Shorts.'],
  ['/photo/', 'photo/index.html', 'Фотографія — Кирило Русанівський', 'Портфоліо фотографа Кирила Русанівського в Києві: репортаж, культура та мистецтво, бекстейдж і портрети.'],
  ['/photo/reportage/', 'photo/reportage/index.html', 'Репортаж — Кирило Русанівський', 'Репортажний фотограф у Києві. Кирило Русанівський знімає публічні заходи, культурні програми, святкування, нічне життя й аудиторії.'],
  ['/photo/culture-art/', 'photo/culture-art/index.html', 'Культура та мистецтво — Кирило Русанівський', 'Фотографія культури та мистецтва в Києві: галереї, інсталяції, відкриття, перформанси, концерти, театр, митці й культурні проєкти.'],
  ['/photo/backstage/', 'photo/backstage/index.html', 'Бекстейдж — Кирило Русанівський', 'Бекстейдж-фотограф у Києві. Фотографія процесів зйомок, знімальних груп, постановок, сцен і живих подій.'],
  ['/photo/portraits/', 'photo/portraits/index.html', 'Портрети — Кирило Русанівський', 'Портретний фотограф у Києві. Портрети для людей, митців і творчих професіоналів — у студії або на локації.'],
  ['/design/', 'design/index.html', 'Друк і дизайн — Кирило Русанівський', 'Портфоліо графічного дизайнера з Києва: дизайн обкладинок, верстка книжок і видань, типографіка, бібліографічні покажчики та поліграфія.'],
  ['/design/covers/', 'design/covers/index.html', 'Дизайн обкладинок — Кирило Русанівський', 'Дизайнер книжкових обкладинок у Києві. Обкладинки, редакційна типографіка, верстка книжок і поліграфія для видавців, авторів і культурних проєктів.'],
];

const lightPortfolioRoutes = new Set([
  '/design/covers/',
  '/photo/reportage/',
  '/photo/culture-art/',
  '/photo/backstage/',
  '/photo/portraits/',
]);
const nightPortfolioRoutes = new Set([
  '/video/reels/',
  '/video/interviewandvlogs/',
  '/video/music/',
  '/video/documentary/',
  '/video/short-form/',
]);

const absolute = (route) => `https://rusanivsky.com${route}`;
const uaRoute = (route) => route === '/' ? '/ua/' : `/ua${route}`;

function alternates(route) {
  return [
    `<link rel="alternate" hreflang="en" href="${absolute(route)}">`,
    `<link rel="alternate" hreflang="uk" href="${absolute(uaRoute(route))}">`,
    `<link rel="alternate" hreflang="x-default" href="${absolute(route)}">`,
  ].join('\n');
}

function updateHead(html, route, title, description, ukrainian) {
  const canonical = absolute(ukrainian ? uaRoute(route) : route);
  html = html.replace(/\n<link rel="alternate" hreflang="(?:en|uk|x-default)" href="[^"]+">/g, '');
  html = html.replace(/<html lang="en"/, `<html lang="${ukrainian ? 'uk' : 'en'}"`);
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`);
  html = html.replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${description}">`);
  html = html.replace(/<link rel="canonical" href="[^"]+">/, `<link rel="canonical" href="${canonical}">\n${alternates(route)}`);
  html = html.replace(/<meta property="og:locale" content="[^"]*">/, `<meta property="og:locale" content="${ukrainian ? 'uk_UA' : 'en_US'}">`);
  html = html.replace(/<meta property="og:url" content="[^"]+">/, `<meta property="og:url" content="${canonical}">`);
  html = html.replace(/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${title}">`);
  html = html.replace(/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${description}">`);
  html = html.replace(/<meta name="twitter:title" content="[^"]*">/, `<meta name="twitter:title" content="${title}">`);
  html = html.replace(/<meta name="twitter:description" content="[^"]*">/, `<meta name="twitter:description" content="${description}">`);
  return html;
}

function ukrainianiseContent(html) {
  // The source already stores approved Ukrainian copy in data-ua. Make it the
  // literal server-delivered text rather than relying on JavaScript to swap it.
  html = html.replace(/(<([a-z][\w-]*)(?:\s[^>]*)?\sdata-en="[^"]*"\sdata-ua="([^"]*)"(?:\s[^>]*)?>)([^<]*)(<\/\2>)/gi, '$1$3$5');
  html = html.replace(/try\{\s*setLang\(detect\w*\(\),\s*false\);\s*\}catch\(e\)\{\s*setLang\('en',\s*false\);\s*\}/, "try{ setLang('ua', false); }catch(e){}");
  // без крапки з комою: у джерелі виклик стоїть як L(D(),false)})();, тож
  // точний рядок із ; не збігався ніколи. Сторінка умов — єдина, що
  // використовує цю коротку форму скрипта (решта ловиться регексом на
  // setLang вище), і саме вона віддавалась з українським текстом, а потім
  // сама перемикала себе на англійську за мовою браузера
  html = html.replace("L(D(),false)", "L('ua',false)");
  html = html.replace(/(<button type="button" data-lang="en" aria-pressed=")true("[^>]*>EN<\/button><button type="button" data-lang="ua" aria-pressed=")false/, '$1false$2true');
  return html;
}

function localiseLinks(html) {
  for (const [route] of pages) {
    const from = `href="${route}"`;
    const to = `href="${uaRoute(route)}"`;
    html = html.split(from).join(to);
  }
  return html;
}

function addContactsLink(html, route) {
  const current = route === '/rates/' ? ' aria-current="page"' : '';
  const en = 'Rates & Terms', ua = 'Умови співпраці';
  const termsLink = `<a class="tiny contact-link" href="/rates/"${current} data-en="${en}" data-ua="${ua}">${en}</a>`;
  const contactsCurrent = route === '/contacts/' ? ' aria-current="page"' : '';
  const contactsLink = `<a class="tiny contact-link mobile-contact-link" href="/contacts/"${contactsCurrent} data-en="Contacts" data-ua="Контакти">Contacts</a>`;
  const fontToggle = '<div class="tgl font-toggle" role="group" aria-label="Font"><button type="button" data-font-toggle="unbounded" aria-pressed="false">U</button></div>';
  const langToggle = '<div class="tgl" id="lang" role="group" aria-label="Language"><button type="button" data-lang="ua" aria-pressed="false" aria-label="Switch to Ukrainian">UA</button></div>';
  // On the home page the link sits next to the language switcher. Keep the
  // same desktop header on every page, including pages whose older source had
  // the link as the fourth item in .parts.
  html = html.replace(/<a class="[^"]*tiny contact-link[^"]*" href="\/(?:contacts|terms|rates)\/"(?: aria-current="page")? data-en="[^"]*" data-ua="[^"]*">[^<]*<\/a>/g, '');
  html = html.replace(/\s*<div class="tgl font-toggle"[^>]*>[\s\S]*?<\/div>/g, '');
  html = html.replace(/\s*<div class="tgl" id="lang"[^>]*>[\s\S]*?<\/div>/g, '');
  html = html.replace(/\n[ \t]*\n[ \t]*<\/nav>/g, '\n  </nav>');
  html = html.replace(
    /<div class="switches">/,
    `<div class="switches">\n    ${termsLink}\n    ${contactsLink}\n    ${fontToggle}\n    ${langToggle}`,
  );
  html = html.replace(/(<div class="switches">)\n[ \t]*\n/g, '$1\n');
  if (!html.includes('<script src="/scripts/font-switcher.js"></script>')) {
    html = html.replace('</head>', '<script src="/scripts/font-switcher.js"></script>\n</head>');
  }
  if (!html.includes('<script src="/scripts/language-switcher.js"></script>')) {
    html = html.replace('</head>', '<script src="/scripts/language-switcher.js"></script>\n</head>');
  }
  return html;
}

function renameWorkTerms(html) {
  return html.replace(/(<h[1-6][^>]*id="s-contact"[^>]*?)data-en="Contacts" data-ua="Контакти"/g, '$1data-en="Work terms" data-ua="Умови роботи"')
    .replace(/(<h[1-6][^>]*id="s-contact"[^>]*>)Contacts(<\/h[1-6]>)/g, '$1Work terms$2')
    .replace(/(Telegram|Behance|Threads|TikTok) @rusanivsky/g, '$1');
}

const themeColour = { light: '#eef1ec', green: '#415d43', night: '#111d13' };

// Тему сторінки вирішує її розділ, а не гість: перемикача в шапці немає,
// нічого не читається з localStorage і нічого не залежить від системної
// схеми. Атрибут стоїть у <html>, тобто ще до першого байта стилів.
function applyThemePolicy(html, route) {
  const theme = lightPortfolioRoutes.has(route) ? 'light' : nightPortfolioRoutes.has(route) ? 'night' : 'green';
  html = html.replace(/<html lang="en"(?: data-theme="(?:light|green|night)")?>/, `<html lang="en" data-theme="${theme}">`);
  html = html.replace(/<meta name="theme-color" content="#[0-9a-f]{6}">/, `<meta name="theme-color" content="${themeColour[theme]}">`);
  return html;
}

await rm(path.join(root, 'ua'), { recursive: true, force: true });
for (const [route, source, title, description] of pages) {
  let english = await readFile(path.join(root, source), 'utf8');
  const englishTitle = english.match(/<title>([^<]*)<\/title>/)?.[1] ?? title;
  const englishDescription = english.match(/<meta name="description" content="([^"]*)">/)?.[1] ?? description;
  english = updateHead(english, route, englishTitle, englishDescription, false);
  english = renameWorkTerms(english);
  english = addContactsLink(english, route);
  english = applyThemePolicy(english, route);
  await writeFile(path.join(root, source), english);

  let ukrainian = ukrainianiseContent(english);
  ukrainian = localiseLinks(ukrainian);
  ukrainian = updateHead(ukrainian, route, title, description, true);
  const output = path.join(root, uaRoute(route), 'index.html');
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, ukrainian);
}

// Сторінки, що переїхали. Заглушка лишається на старій адресі в обох мовах:
// GitHub Pages не вміє 301.
const moved = [
  ['/terms/', '/rates/'],
  ['/video/interviews/', '/video/interviewandvlogs/'],
  ['/video/vlogs/', '/video/interviewandvlogs/'],
  ['/photo/public-events/', '/photo/reportage/'],
  ['/photo/art-events/', '/photo/culture-art/'],
  ['/photo/concerts-theatre/', '/photo/culture-art/'],
  ['/photo/parties/', '/photo/reportage/'],
  ['/photo/photo-sessions/', '/photo/portraits/'],
];
for (const [from, to] of moved) {
  for (const [oldRoute, newRoute, lang, title, sentence] of [
    [from, to, 'en', 'Moved — Kyrylo Rusanivsky', `This page moved to <a href="${to}">${to}</a>.`],
    [uaRoute(from), uaRoute(to), 'uk', 'Сторінку перенесено — Кирило Русанівський',
      `Сторінку перенесено на <a href="${uaRoute(to)}">${uaRoute(to)}</a>.`],
  ]) {
    const html = `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<title>${title}</title>
<link rel="canonical" href="${absolute(newRoute)}">
<meta name="robots" content="noindex">
<meta http-equiv="refresh" content="0; url=${newRoute}">
</head>
<body>
<p>${sentence}</p>
</body>
</html>
`;
    const out = path.join(root, oldRoute, 'index.html');
    await mkdir(path.dirname(out), { recursive: true });
    await writeFile(out, html);
  }
}

const sitemapUrls = pages.flatMap(([route]) => [route, uaRoute(route)]);
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapUrls.map((route) => `  <url><loc>${absolute(route)}</loc><lastmod>2026-09-09</lastmod><changefreq>monthly</changefreq><priority>${route === '/' || route === '/ua/' ? '1.0' : '0.7'}</priority></url>`).join('\n')}\n</urlset>\n`;
await writeFile(path.join(root, 'sitemap.xml'), sitemap);

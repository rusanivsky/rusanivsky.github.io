import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const pages = [
  ['/', 'index.html', 'Кирило Русанівський — графічний дизайнер, відеомонтажер і фотограф', 'Кирило Русанівський — графічний дизайнер, відеомонтажер і фотограф із Києва. Дизайн книжок і обкладинок, верстка, монтаж відео, репортажна та портретна фотографія.'],
  ['/contacts/', 'contacts/index.html', 'Контакти — Кирило Русанівський', 'Контакти Кирила Русанівського — графічного дизайнера, відеомонтажера і фотографа з Києва.'],
  ['/video/', 'video/index.html', 'Відеомонтаж — Кирило Русанівський', 'Портфоліо відеомонтажера з Києва Кирила Русанівського: інтерв’ю, YouTube-серії, музичні кліпи, документальні фільми, влоги та відео для соцмереж.'],
  ['/video/interviews/', 'video/interviews/index.html', 'Інтерв’ю — Кирило Русанівський', 'Зйомка й монтаж інтерв’ю в Києві: редакційні та розмовні відео, інтерв’ю для YouTube і контент для соціальних мереж.'],
  ['/video/music/', 'video/music/index.html', 'Музичні кліпи — Кирило Русанівський', 'Портфоліо зі зйомки та монтажу музичних кліпів Кирила Русанівського: творчі відео для музикантів, артистів, релізів і живих виступів.'],
  ['/video/documentary/', 'video/documentary/index.html', 'Документалістика — Кирило Русанівський', 'Документальні фільми та відеомонтаж у Києві: історії людей, культурні проєкти, інтерв’ю та спостережне відео.'],
  ['/video/vlogs/', 'video/vlogs/index.html', 'Влоги — Кирило Русанівський', 'Монтаж влогів і YouTube-відео в Києві: авторський контент, відео для соцмереж, регулярні серії, подорожі та лайфстайл.'],
  ['/photo/', 'photo/index.html', 'Фотографія — Кирило Русанівський', 'Портфоліо фотографа Кирила Русанівського в Києві: публічні й мистецькі події, концерти, театр, бекстейдж, вечірки та портретні фотосесії.'],
  ['/photo/public-events/', 'photo/public-events/index.html', 'Публічні заходи — Кирило Русанівський', 'Фотограф публічних заходів у Києві. Кирило Русанівський знімає конференції, форуми, культурні програми, спікерів і аудиторії.'],
  ['/photo/art-events/', 'photo/art-events/index.html', 'Мистецькі події — Кирило Русанівський', 'Фотографія мистецьких подій і виставок у Києві: галереї, інсталяції, відкриття, перформанси, художники та культурні проєкти.'],
  ['/photo/backstage/', 'photo/backstage/index.html', 'Бекстейдж — Кирило Русанівський', 'Бекстейдж-фотограф у Києві. Фотографія процесів зйомок, знімальних груп, постановок, сцен і живих подій.'],
  ['/photo/concerts-theatre/', 'photo/concerts-theatre/index.html', 'Концерти й театр — Кирило Русанівський', 'Фотограф концертів і театру в Києві. Кирило Русанівський знімає живу музику, вистави, виконавців, глядачів і культурні події.'],
  ['/photo/parties/', 'photo/parties/index.html', 'Вечірки — Кирило Русанівський', 'Фотограф вечірок і клубних подій у Києві. Репортажна фотографія нічного життя, святкувань, DJ-сетів, закладів і брендових заходів.'],
  ['/photo/photo-sessions/', 'photo/photo-sessions/index.html', 'Фотосесії — Кирило Русанівський', 'Портретний фотограф у Києві. Фотосесії для людей, митців і творчих професіоналів — у студії або на локації.'],
  ['/design/', 'design/index.html', 'Друк і дизайн — Кирило Русанівський', 'Портфоліо графічного дизайнера з Києва: дизайн обкладинок, верстка книжок і видань, типографіка, бібліографічні покажчики та поліграфія.'],
  ['/design/covers/', 'design/covers/index.html', 'Дизайн обкладинок — Кирило Русанівський', 'Дизайнер книжкових обкладинок у Києві. Обкладинки, редакційна типографіка, верстка книжок і поліграфія для видавців, авторів і культурних проєктів.'],
];

const lightPortfolioRoutes = new Set([
  '/design/covers/',
  '/photo/public-events/',
  '/photo/art-events/',
  '/photo/backstage/',
  '/photo/concerts-theatre/',
  '/photo/parties/',
  '/photo/photo-sessions/',
]);
const nightPortfolioRoutes = new Set([
  '/video/interviews/',
  '/video/music/',
  '/video/documentary/',
  '/video/vlogs/',
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
  html = html.replace("L(D(),false);", "L('ua',false);");
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

function addContactsLink(html) {
  if (html.includes('class="tiny contact-link"')) return html;
  return html.replace(
    '<div class="tgl" id="lang"',
    '<a class="tiny contact-link" href="/contacts/" data-en="Contacts" data-ua="Контакти">Contacts</a>\n    <div class="tgl" id="lang"',
  );
}

function applyThemePolicy(html, route) {
  const lockedTheme = lightPortfolioRoutes.has(route) ? 'light' : nightPortfolioRoutes.has(route) ? 'night' : null;
  html = html.replace(/<html lang="en"(?: data-theme-lock="(?:light|night)")?>/, lockedTheme
    ? `<html lang="en" data-theme-lock="${lockedTheme}">`
    : '<html lang="en">');
  html = html.replace(
    "document.documentElement.classList.add('rev');document.documentElement.setAttribute('data-theme','green');try{var t=localStorage.getItem('kr-theme');if(t==='dark')t='green';if(t==='light'||t==='green'||t==='night')document.documentElement.setAttribute('data-theme',t)}catch(e){}",
    "document.documentElement.classList.add('rev');var q=document.documentElement.getAttribute('data-theme-lock');document.documentElement.setAttribute('data-theme',q||'green');try{var t=localStorage.getItem('kr-theme');if(t==='dark')t='green';if(!q&&(t==='light'||t==='green'||t==='night'))document.documentElement.setAttribute('data-theme',t)}catch(e){}",
  );
  html = html.replace(
    "var saved = null;\n    try{ saved = localStorage.getItem('kr-theme'); }catch(e){}",
    "var locked = root.getAttribute('data-theme-lock');\n    if(locked){ setTheme(locked, false); return; }\n    var saved = null;\n    try{ saved = localStorage.getItem('kr-theme'); }catch(e){}",
  );
  return html;
}

await rm(path.join(root, 'ua'), { recursive: true, force: true });
for (const [route, source, title, description] of pages) {
  let english = await readFile(path.join(root, source), 'utf8');
  const englishTitle = english.match(/<title>([^<]*)<\/title>/)?.[1] ?? title;
  const englishDescription = english.match(/<meta name="description" content="([^"]*)">/)?.[1] ?? description;
  english = updateHead(english, route, englishTitle, englishDescription, false);
  english = addContactsLink(english);
  english = applyThemePolicy(english, route);
  await writeFile(path.join(root, source), english);

  let ukrainian = ukrainianiseContent(english);
  ukrainian = localiseLinks(ukrainian);
  ukrainian = updateHead(ukrainian, route, title, description, true);
  const output = path.join(root, uaRoute(route), 'index.html');
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, ukrainian);
}

const sitemapUrls = pages.flatMap(([route]) => [route, uaRoute(route)]);
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapUrls.map((route) => `  <url><loc>${absolute(route)}</loc><lastmod>2026-09-06</lastmod><changefreq>monthly</changefreq><priority>${route === '/' || route === '/ua/' ? '1.0' : '0.7'}</priority></url>`).join('\n')}\n</urlset>\n`;
await writeFile(path.join(root, 'sitemap.xml'), sitemap);

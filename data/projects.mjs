/*
  Project data layer — V0.2.

  Every string here was lifted from the production site at rusanivsky.com.
  Nothing is invented: no titles, clients, credits, roles or dates that the
  live site does not already state. `year` stays null wherever the source
  content never named one — an omitted year is honest, a guessed one is not.

  A project is the unit. A project that is both filmed and edited appears
  once, with two roles, not twice under two practices.

  Media ids are stable and independent of filenames, so the `src` field can
  later be repointed at media.rusanivsky.com without the id changing.
*/

import photoSequences from './photo-sequences.json' with { type: 'json' };

const POSTER = '/media/video/posters/';
const THUMB = '/media/video/thumbs/';

/* Photography series reuse the production running order, which is already an
   edit rather than a dump. `lead` is how many frames open the project page;
   the rest stay one click away instead of being thrown out. */
function series(key, leadCount) {
  return photoSequences[key].map((f, i) => ({
    id: `ph-${key}-${String(i + 1).padStart(3, '0')}`,
    type: 'image',
    src: f.src,
    alt: f.alt,
    lead: i < leadCount,
  }));
}

function video(platform, id, title, poster) {
  return { id: `vd-${id}`, type: 'video', platform, videoId: id, title, poster };
}

export const projects = [
  {
    id: 'p-sounds-of-chornobyl',
    slug: 'sounds-of-chornobyl',
    title: { en: 'Sounds of Chornobyl', ua: 'Sounds of Chornobyl' },
    year: null,
    client: 'Ukrainian Cultural Foundation',
    context: 'commissioned',
    disciplines: ['video'],
    roles: ['Camera'],
    shortDescription: {
      en: 'A music project for the anniversary of the disaster: a documentary film and two performances recorded inside the exclusion zone.',
      ua: 'Музичний проєкт до річниці катастрофи: документальний фільм і два виступи, зняті в зоні відчуження.',
    },
    credits: [
      { en: 'Director — Valeriy Korshunov', ua: 'Режисер — Валерій Коршунов' },
      { en: 'Camera Operators — Dmytro Zolotov and Kyrylo Rusanivsky', ua: 'Оператори — Дмитро Золотов і Кирило Русанівський' },
      { en: 'FPV Drone Pilots (Zbroy Films) — Andrii Zbroy, Sviatoslav Zbroy', ua: 'FPV-пілоти (Zbroy Films) — Андрій Зброй, Святослав Зброй' },
      { en: 'Video Editing & Color — Valeriy Korshunov, Serhii Zeinalov, Maria Illina', ua: 'Монтаж і колір — Валерій Коршунов, Сергій Зейналов, Марія Ілліна' },
    ],
    cover: `${THUMB}yt-m3JY9PaAo9s.jpg`,
    media: [
      video('yt', 'm3JY9PaAo9s', 'Sounds of Chornobyl — a music project for the anniversary of the disaster', `${THUMB}yt-m3JY9PaAo9s.jpg`),
      video('yt', '5Fm88FAd9Ng', 'Zavoloka for SOUNDS OF CHORNOBYL', `${THUMB}yt-5Fm88FAd9Ng.jpg`),
      video('yt', '4Ai9QeqAmCU', 'Voin Oruwu for SOUNDS OF CHORNOBYL', `${THUMB}yt-4Ai9QeqAmCU.jpg`),
    ],
    externalLinks: [],
    featured: false,
  },

  {
    id: 'p-kmbs-defence',
    slug: 'kmbs-defence-programmes',
    title: { en: 'Strategic and Security Programmes', ua: 'Стратегічні та безпекові програми' },
    year: '2024–2025',
    client: 'Kyiv-Mohyla Business School',
    context: 'commissioned',
    disciplines: ['video'],
    roles: ['Camera', 'Editing'],
    shortDescription: {
      en: 'Films for the business school for leaders in business, government and defence: graduations, programme starts and the signing of a memorandum.',
      ua: 'Фільми для бізнес-школи для лідерів бізнесу, держави та сектору безпеки й оборони: випуски, старти програм і підписання меморандуму.',
    },
    credits: [
      { en: 'Camera Operator & Editor — Kyrylo Rusanivsky', ua: 'Оператор і режисер монтажу — Кирило Русанівський' },
    ],
    cover: `${POSTER}das-graduation-episode-3-poster.jpg`,
    media: [
      video('yt', 'HP4ujuCuX2I', 'Strategic Program for the Development of the Defense Forces of Ukraine’s Armament System — Graduation 2025', `${POSTER}das-graduation-episode-3-poster.jpg`),
      video('yt', 'I822C4jGDY4', 'Strategic Leadership Program in Security and Defense of Ukraine — Graduation 2025', `${POSTER}slp-episode-5-poster.jpg`),
      video('yt', 'rmt8Y3PYLXw', 'School of Strategic Architect — Start 2025', `${POSTER}ssa-start-2025-poster.jpg`),
      video('yt', '2UqVxbKSs18', 'Strategic Program for the Development of the Defense Forces of Ukraine’s Armament System — Graduation Ceremony 2024', `${POSTER}das-graduation-2024-poster.jpg`),
      video('yt', 'QweaFhMj4tw', 'Strategic Leadership Program in Security and Defense of Ukraine — Graduation 2024', `${POSTER}slp-graduation-2024-poster.jpg`),
      video('yt', 'GAxQnmNF2pU', 'School of Strategic Architect — Start 2024', `${POSTER}ssa-start-2024-poster.jpg`),
      video('yt', '6SaVeSP4txE', 'Signing a memorandum during the Strategic Program for the Development of the Defense Forces of Ukraine’s Armament System', `${POSTER}signing-the-memorandum-poster.jpg`),
    ],
    externalLinks: [],
    featured: true,
    featuredOrder: 2,
  },

  {
    id: 'p-reportage',
    slug: 'reportage',
    title: { en: 'Reportage', ua: 'Репортаж' },
    year: null,
    client: null,
    context: 'commissioned',
    disciplines: ['photography'],
    roles: ['Photography'],
    shortDescription: {
      en: 'Public events and parties, photographed as they happen.',
      ua: 'Публічні заходи й вечірки, зняті так, як вони відбуваються.',
    },
    credits: [],
    cover: photoSequences.reportage[0].src,
    media: series('reportage', 16),
    externalLinks: [],
    featured: true,
    featuredOrder: 1,
  },

  {
    id: 'p-istoriya-ukrayini-2020',
    slug: 'istoriya-ukrayini-2020',
    /* The slug keeps the year the cover was made for — it is the address the
       old site published and nothing is gained by breaking it — but the
       project is named for the series, not for one of its volumes. */
    title: { en: 'Історія України', ua: 'Історія України' },
    year: null,
    client: 'National Historical Library of Ukraine',
    context: 'commissioned',
    disciplines: ['design'],
    roles: ['Cover design'],
    shortDescription: {
      en: '“Istoriia Ukrainy” is a series of annual bibliographic indexes published by the National Historical Library of Ukraine — one volume a year, each gathering the year’s writing on the country’s history. The cover for the 2020 volume is built around a 1918 map of Ukraine found in the Ivan Franko Ukrainian Centre library in Richmond, Canada.',
      ua: '«Історія України» — серія щорічних бібліографічних покажчиків Національної історичної бібліотеки України: один том на рік, і кожен збирає написане за рік про історію країни. Обкладинка тому за 2020 рік скомпонована з карти України 1918 року, знайденої в бібліотеці Українського центру імені Івана Франка у Річмонді, Канада.',
    },
    credits: [],
    cover: '/media/design/istoriya-ukrayini-2020.webp',
    media: [
      { id: 'dg-iu2020-01', type: 'image', src: '/media/design/istoriya-ukrayini-2020.webp', alt: 'History of Ukraine. 2020 cover', lead: true },
    ],
    externalLinks: [{ label: 'Behance', href: 'https://www.behance.net/gallery/133703119/storja-ukrani-2020' }],
    featured: true,
    featuredOrder: 6,
  },

  {
    id: 'p-yd-interior-studio',
    slug: 'yd-interior-studio',
    title: { en: 'YD Interior Studio', ua: 'YD Interior Studio' },
    year: null,
    client: 'YD interior studio',
    context: 'commissioned',
    disciplines: ['video'],
    roles: ['Camera', 'Editing'],
    shortDescription: {
      en: 'An ongoing YouTube series for Yevheniia Dubrovska’s interior design studio: interviews, project tours and explainers.',
      ua: 'Тривала YouTube-серія для студії інтерʼєрного дизайну Євгенії Дубровської: інтервʼю, тури проєктами й пояснювальні ролики.',
    },
    credits: [
      { en: 'DOP & Editor — Kyrylo Rusanivsky', ua: 'Оператор і монтажер — Кирило Русанівський' },
      { en: 'DOP on part of the series — Andrew Shurpenkov', ua: 'Оператор частини серії — Андрій Шурпенков' },
    ],
    cover: `${THUMB}yt-3ityvlL8js4.jpg`,
    media: [
      video('yt', '3ityvlL8js4', 'Interview with photographer Yevhenii Avramenko', `${THUMB}yt-3ityvlL8js4.jpg`),
      video('yt', 'wM2vY2mxudY', 'INTERIOR DESIGN PROJECT. 8 stages of interior design.', `${THUMB}yt-wM2vY2mxudY.jpg`),
      video('yt', '8Bc_-qWoE88', 'APARTMENT AT THE GOLDEN GATES! Golden Gates Apartment', `${THUMB}yt-8Bc_-qWoE88.jpg`),
      video('yt', 'IPUMbGi5hEM', 'Apartment at the Golden Gates by YD interior studio', `${THUMB}yt-IPUMbGi5hEM.jpg`),
      video('yt', '_JHtw89_Sqs', 'Apartment in a historic building by YD interior studio', `${THUMB}yt-_JHtw89_Sqs.jpg`),
      video('yt', 'KfntGEmXXbU', 'Interview with Kateryna Sokolova', `${THUMB}yt-KfntGEmXXbU.jpg`),
      video('yt', 'AMliGSWBDbI', 'Interiors in the TV series “Friends”', `${THUMB}yt-AMliGSWBDbI.jpg`),
      video('yt', 'WwS5h3ceuX0', 'A comfortable workspace — looking at every option', `${THUMB}yt-WwS5h3ceuX0.jpg`),
      video('yt', 'cFCwHnrfB2w', 'How I got on television', `${THUMB}yt-cFCwHnrfB2w.jpg`),
    ],
    externalLinks: [],
    featured: true,
    featuredOrder: 4,
  },

  {
    id: 'p-culture-art',
    slug: 'culture-and-art',
    title: { en: 'Culture & art', ua: 'Культура та мистецтво' },
    year: null,
    client: null,
    context: 'commissioned',
    disciplines: ['photography'],
    roles: ['Photography'],
    shortDescription: {
      en: 'Concerts, theatre and art events.',
      ua: 'Концерти, театр і мистецькі події.',
    },
    credits: [],
    cover: photoSequences['culture-art'][0].src,
    media: series('culture-art', 16),
    externalLinks: [],
    featured: true,
    featuredOrder: 3,
  },

  {
    id: 'p-dyvochyv',
    slug: 'reels',
    title: { en: 'Reels', ua: 'Reels' },
    year: null,
    client: 'Tsyronian Agency',
    context: 'commissioned',
    disciplines: ['video'],
    roles: ['Camera', 'Editing'],
    shortDescription: {
      en: 'A series of short videos: two for Dyvochyv, a Ukrainian brand of embroidered table textiles, and one about the art book “A Very Cozy Book” — a publication that draws attention to the smallest details and celebrates the elements that create a sense of coziness. A book made with great love and a deep appreciation for beauty.',
      ua: 'Серія коротких відео: два — для Dyvochyv, українського бренду вишитого столового текстилю, і одне — про артбук «A Very Cozy Book» — видання, яке звертає увагу на найдрібніші деталі й оспівує те, з чого складається відчуття затишку. Книжка, зроблена з великою любовʼю і глибокою повагою до краси.',
    },
    credits: [
      { en: 'Director — Musheh Tsyronian', ua: 'Режисер — Мушег Циронян' },
      { en: 'Camera Operator & Editor — Kyrylo Rusanivsky', ua: 'Оператор і монтажер — Кирило Русанівський' },
    ],
    cover: `${POSTER}dyvoshyv-poster.jpg`,
    /* Where the 16:9 preview crop sits on a cover that is not 16:9.
       A standing frame: the embroidered motif is in the upper half. */
    coverFocus: '50% 40%',
    media: [
      video('yt', 'w9t-SHkLML0', 'Dyvochyv', `${POSTER}dyvoshyv-poster.jpg`),
      video('yt', 'iJCBQgwv9ew', 'Dyvochyv', `${POSTER}the-coat-poster.jpg`),
      video('yt', 'hvrDWsMeXh8', 'Alisa Levchenko — “A Very Cozy Book”', `${POSTER}tsyronian-publishing-poster.jpg`),
    ],
    externalLinks: [],
    featured: true,
    featuredOrder: 5,
  },

  {
    id: 'p-shylero-utility-bag',
    slug: 'shylero-utility-bag',
    /* The slug keeps the singular the first file was named with; the project
       is the series, so the title does not. */
    title: { en: 'Utility Bags by SHYLERO', ua: 'Utility Bags by SHYLERO' },
    year: null,
    client: 'SHYLERO',
    context: 'commissioned',
    disciplines: ['video'],
    roles: ['Camera', 'Editing'],
    shortDescription: {
      en: 'A short product film for SHYLERO, a Ukrainian maker of bags — the series of utility bags and backpacks the company builds, filmed and cut as one piece.',
      ua: 'Короткий продуктовий ролик для SHYLERO, українського виробника сумок, — про серію утилітарних сумок і рюкзаків, які робить компанія, зняту і змонтовану одним фільмом.',
    },
    credits: [
      { en: 'Camera Operator & Editor — Kyrylo Rusanivsky', ua: 'Оператор і монтажер — Кирило Русанівський' },
    ],
    cover: `${POSTER}utility-bag-poster.jpg`,
    media: [
      video('yt', 'EfoTXc5AVkk', 'Utility Bags by SHYLERO', `${POSTER}utility-bag-poster.jpg`),
    ],
    externalLinks: [],
    featured: false,
  },

  {
    id: 'p-ua-trance-family',
    slug: 'ua-trance-family',
    title: { en: 'UA Trance Family', ua: 'UA Trance Family' },
    /* The span comes from the dates the films themselves carry — 2013 for the
       Armin van Buuren meeting, 2019 for the Galaxy Station interview. */
    year: '2013–2019',
    client: 'UATF',
    context: 'commissioned',
    disciplines: ['video'],
    roles: ['Camera', 'Editing'],
    shortDescription: {
      en: 'Aftermovies and interviews for the UA Trance Family community in Kyiv: club nights and festival editions, and meetings with Armin van Buuren, Aly & Fila, Solarstone and Mark Sixma.',
      ua: 'Афтермуві та інтервʼю для спільноти UA Trance Family у Києві: клубні вечірки й фестивальні едишени, зустрічі з Armin van Buuren, Aly & Fila, Solarstone і Mark Sixma.',
    },
    credits: [
      { en: 'Camera Operator & Editor — Kyrylo Rusanivsky', ua: 'Оператор і монтажер — Кирило Русанівський' },
    ],
    cover: `${THUMB}yt-BP80RxWWHa4.jpg`,
    media: [
      video('yt', 'BP80RxWWHa4', 'ATB – neXt World Tour. Aftermovie (Kyiv, 02.06.2017)', `${THUMB}yt-BP80RxWWHa4.jpg`),
      video('yt', 'DyyB1bUKIyc', 'UA Trance Family 5 Years B-Day Aftermovie (Kyiv, 07.10.2016)', `${THUMB}yt-DyyB1bUKIyc.jpg`),
      video('yt', 'nMCrhktcs0E', 'UA Trance Family Party with Mark Sixma (Aftermovie – 23.02.2018)', `${THUMB}yt-nMCrhktcs0E.jpg`),
      video('yt', 'tQj7MmXobBE', 'Club Styles Fest – Trance Edition Vol. 2 (UA Trance Family Aftermovie)', `${THUMB}yt-tQj7MmXobBE.jpg`),
      video('yt', 'V59QT_ofjtk', 'Solarstone @ UA Trance Family Party (Kyiv, 22.06.2018)', `${THUMB}yt-V59QT_ofjtk.jpg`),
      video('yt', 'e1sokpvI3vI', 'Meet & Greet with Armin van Buuren (Kyiv, 28/12/2013)', `${THUMB}yt-e1sokpvI3vI.jpg`),
      video('yt', 'zracF8DRdUg', 'UATF Interview @ Galaxy Station, Kyiv, 15.06.2019 [UKR SUB]', `${THUMB}yt-zracF8DRdUg.jpg`),
      video('yt', 'OEj3qL3pQXU', 'UATF Interview with Aly & Fila @ Atlas Kyiv, 08.09.2018 [UKR SUB]', `${THUMB}yt-OEj3qL3pQXU.jpg`),
    ],
    externalLinks: [],
    featured: false,
  },

  {
    id: 'p-word-and-music',
    slug: 'word-and-music',
    title: { en: 'Word & Music', ua: 'Word & Music' },
    /* Three of the five films name 2023 in their own titles; the two
       Christmas programmes name no year at all, so the project does not
       claim one for them. */
    year: null,
    client: null,
    context: 'commissioned',
    disciplines: ['video'],
    roles: ['Producing', 'Camera', 'Editing'],
    shortDescription: {
      en: 'Concert films for Sadyba na Kudriavtsi and the National Scientific Medical Library of Ukraine: evenings of classical music and Christmas programmes — produced, filmed and edited.',
      ua: 'Концертні зйомки для «Садиби на Кудрявці» та Національної наукової медичної бібліотеки України: вечори класичної музики та різдвяні програми — продюсування, зйомка, монтаж.',
    },
    credits: [
      { en: 'Producer, DOP & Editor — Kyrylo Rusanivsky', ua: 'Продюсер, оператор і монтажер — Кирило Русанівський' },
    ],
    cover: `${THUMB}yt-JAMDscAMvQA.jpg`,
    media: [
      video('yt', 'JAMDscAMvQA', 'Christmas Kaleidoscope at Sadyba na Kudriavtsi', `${THUMB}yt-JAMDscAMvQA.jpg`),
      video('yt', 'bpz1jSrtFMA', '“Winter Fairytale” — a Christmas evening of classical music', `${THUMB}yt-bpz1jSrtFMA.jpg`),
      video('yt', '474f5Yrp5-o', '“Music of the Soul and Heart” concert at Sadyba na Kudriavtsi (2023)', `${THUMB}yt-474f5Yrp5-o.jpg`),
      video('yt', 'qU1Jl_9ZuGQ', '“Amore Eterno” concert at Sadyba na Kudriavtsi (2023)', `${THUMB}yt-qU1Jl_9ZuGQ.jpg`),
      video('yt', 'UaWqVU8fUw4', '“Struny Sertsia” concert at Sadyba na Kudriavtsi (2023)', `${THUMB}yt-UaWqVU8fUw4.jpg`),
    ],
    externalLinks: [],
    featured: false,
  },

  {
    id: 'p-istorichna-shevchenkiana',
    slug: 'istorichna-shevchenkiana',
    title: { en: 'Історична Шевченкіана', ua: 'Історична Шевченкіана' },
    year: '2016',
    client: 'National Historical Library of Ukraine',
    context: 'commissioned',
    disciplines: ['design'],
    roles: ['Cover design'],
    shortDescription: {
      en: 'Cover design for the bibliographic index “Istorychna Shevchenkiana” for the Historical Library, 2016. A classical treatment in soft colours, as befits an academic reference edition. The front carries a portrait of Taras Shevchenko and a sample of his handwriting; the back, his painting of the Exaltation Monastery in Poltava.',
      ua: 'Дизайн обкладинки бібліографічного покажчика «Історична Шевченкіана» для Історичної бібліотеки, 2016. Класичне оформлення з мʼякими кольорами, як і належить науково-довідковому виданню. Передня сторона — портрет Тараса Шевченка і взірець його почерку; задня — його картина «Воздвиженський монастир у Полтаві».',
    },
    credits: [],
    cover: '/media/design/istorichna-shevchenkiana-1.webp',
    media: [
      { id: 'dg-shev-01', type: 'image', src: '/media/design/istorichna-shevchenkiana-1.webp', alt: 'Historical Shevchenkiana cover, front', lead: true },
      { id: 'dg-shev-02', type: 'image', src: '/media/design/istorichna-shevchenkiana-2.webp', alt: 'Historical Shevchenkiana cover, back', lead: true },
    ],
    externalLinks: [{ label: 'Behance', href: 'https://www.behance.net/gallery/121185879/storichna-shevchenkana' }],
    featured: false,
  },

  {
    id: 'p-portraits',
    slug: 'portraits',
    title: { en: 'Portraits', ua: 'Портрети' },
    year: null,
    client: null,
    context: 'commissioned',
    disciplines: ['photography'],
    roles: ['Photography'],
    shortDescription: {
      en: 'Photo sessions — people, in and out of the studio.',
      ua: 'Фотосесії — люди в студії й поза нею.',
    },
    credits: [],
    cover: photoSequences.portraits[0].src,
    media: series('portraits', 14),
    externalLinks: [],
    featured: true,
    featuredOrder: 7,
  },

  {
    id: 'p-chornobyl35',
    slug: 'chornobyl-35',
    title: { en: 'Chornobyl.35', ua: 'Chornobyl.35' },
    year: null,
    client: 'National Historical Library of Ukraine',
    context: 'commissioned',
    disciplines: ['design'],
    roles: ['Cover design'],
    shortDescription: {
      en: 'Cover for the bibliographic list “Chornobyl.35” of the National Historical Library of Ukraine.',
      ua: 'Обкладинка для бібліографічного списку «Чорнобиль.35» Національної історичної бібліотеки України.',
    },
    credits: [],
    cover: '/media/design/chornobyl35.webp',
    /* The title sits in the lower third of the cover, so the preview
       crop is taken from the bottom, not the middle. */
    coverFocus: '50% 82%',
    media: [
      { id: 'dg-ch35-01', type: 'image', src: '/media/design/chornobyl35.webp', alt: 'Chornobyl.35', lead: true },
    ],
    externalLinks: [{ label: 'Behance', href: 'https://www.behance.net/gallery/118894269/Chornobyl35' }],
    featured: false,
  },

  {
    id: 'p-backstage',
    slug: 'backstage',
    title: { en: 'Backstage', ua: 'Бекстейдж' },
    year: null,
    client: null,
    context: 'commissioned',
    disciplines: ['photography'],
    roles: ['Photography'],
    shortDescription: {
      en: 'What happens on the other side of the event.',
      ua: 'Те, що відбувається по інший бік події.',
    },
    credits: [],
    cover: photoSequences.backstage[0].src,
    media: series('backstage', 15),
    externalLinks: [],
    featured: true,
    featuredOrder: 8,
  },

  {
    id: 'p-verkhovyna-churches',
    slug: 'wooden-churches-of-verkhovyna',
    title: { en: 'Unique Wooden Churches of Verkhovyna', ua: 'Унікальні дерев’яні церкви Верховини' },
    year: null,
    client: 'Espreso',
    context: 'commissioned',
    disciplines: ['video'],
    roles: ['Camera'],
    shortDescription: {
      en: 'A documentary for Espreso, a Ukrainian TV channel and media company.',
      ua: 'Документальний фільм для Espreso, українського телеканалу й медіакомпанії.',
    },
    credits: [
      { en: 'Director — Mykhailo Krupiievskyi', ua: 'Режисер — Михайло Крупієвський' },
      { en: 'Camera Operators — Mykhailo Krupiievskyi and Kyrylo Rusanivsky', ua: 'Оператори — Михайло Крупієвський і Кирило Русанівський' },
    ],
    cover: `${THUMB}yt-xBjOFI02JTE.jpg`,
    media: [
      video('yt', 'xBjOFI02JTE', 'Unique Wooden Churches of Verkhovyna', `${THUMB}yt-xBjOFI02JTE.jpg`),
    ],
    externalLinks: [],
    featured: false,
  },
];

/* The video catalogue: everything filmed or edited that is not already inside
   a selected project. Grouped by the role metadata the brief asks for rather
   than split into Reels / Shorts / Social top-level pages. */
export const videoCatalogue = [
  {
    key: 'music-and-performance',
    title: { en: 'Music and performance', ua: 'Музика і виступи' },
    items: [
      { ...video('yt', 'EgGRvAtmZ2M', 'Agami Mosh — Live @ Radio Intense Ukraine / Techno DJ Mix 2022 4K', `${THUMB}yt-EgGRvAtmZ2M.jpg`), client: null, role: 'DOP & Editor' },
      { ...video('yt', 'UpHo4w54qLI', 'Julia Yablonska – Mirage [4K]', `${THUMB}yt-UpHo4w54qLI.jpg`), client: null, role: 'DOP & Editor' },
      { ...video('yt', '7ojQd4XWNOI', '8Kays — Sun Will Come Out EP // Live', `${THUMB}yt-7ojQd4XWNOI.jpg`), client: null, role: 'DOP' },
      { ...video('yt', 'k1IiVSWgBh0', 'Imagine Dragons. Believer (cover)', `${THUMB}yt-k1IiVSWgBh0.jpg`), client: null, role: 'DOP & Editor' },
      { ...video('yt', 'PBx9BUSl1H4', 'Sting – Shape Of My Heart (fragment)', `${THUMB}yt-PBx9BUSl1H4.jpg`), client: null, role: 'DOP & Editor' },
      { ...video('yt', 'M9JZIY9FnP0', 'LIVE PROMO 2020 | IN WHITE COVER BAND', `${THUMB}yt-M9JZIY9FnP0.jpg`), client: null, role: 'Camera & Editor' },
      { ...video('yt', 'xohvEn-YaP4', 'FIREWORK COVER BAND — DEMO', `${THUMB}yt-xohvEn-YaP4.jpg`), client: null, role: 'Camera & Editor' },
      { ...video('yt', 'GAhVfJsmKyM', 'APLAY', `${THUMB}yt-GAhVfJsmKyM.jpg`), client: null, role: 'DOP & Editor' },
      { ...video('vm', '319037801', 'Marina Sherstnova Pianist', `${THUMB}vimeo-761508323.jpg`), client: null, role: 'Camera & Editor' },
      { ...video('vm', '319019893', 'Korolivna — the spirit of folk tradition', `${THUMB}vimeo-761480308.jpg`), client: null, role: 'Camera & Editor' },
      { ...video('vm', '186293574', 'Anna Nechai – Zest For Life', `${THUMB}vimeo-596334168.jpg`), client: null, role: 'DOP & Editor' },
      { ...video('yt', '69HzVdLELGg', 'Getting to know the ukulele', `${THUMB}yt-69HzVdLELGg.jpg`), client: null, role: 'DOP & Editor' },
    ],
  },
  /* Weddings sit here rather than under a heading of their own: a wedding is
     an event, and two films do not make a category. The group keeps the
     events title. */
  {
    key: 'events-and-aftermovies',
    title: { en: 'Events and aftermovies', ua: 'Події та афтермуві' },
    items: [
      { ...video('yt', 'BFX3B9sv5-Y', 'Musheh Tsyronian’s book presentation — “A Life That Never Stopped”', `${POSTER}altns-main-edit-poster.jpg`), client: null, role: 'Editing' },
      { ...video('yt', 'C_eK5i5dvuU', 'Oleksandr & Anna. Wedding Day. Highlights (03.07.2021)', `${THUMB}yt-C_eK5i5dvuU.jpg`), client: null, role: 'Camera & Editor' },
      { ...video('yt', 'nHrFbu5yLBg', 'Oleksandr & Olha. Wedding Day. Highlights (05.09.2020)', `${THUMB}yt-nHrFbu5yLBg.jpg`), client: null, role: 'Camera & Editor' },
    ],
  },
];

export const clients = [
  { name: 'Kyiv-Mohyla Business School', href: 'https://kmbs.ua/ua' },
  { name: 'Kooperativ', href: 'https://www.kooperativ.cc' },
  { name: 'YD Interior Studio', href: 'https://ydinterior.studio/' },
  { name: 'National University of Kyiv-Mohyla Academy', href: 'https://www.ukma.edu.ua/' },
  { name: 'Defenders of Ukraine Center', href: 'https://www.instagram.com/defenders.ukma' },
  { name: 'Tsyronian Publishing', href: 'https://www.instagram.com/tsyronian.publishing' },
  { name: 'Tsyronian Agency', href: 'https://www.instagram.com/tsyronian.agency/' },
  { name: 'SHYLERO', href: 'https://shylero.com/' },
  { name: 'National Historical Library of Ukraine', href: 'https://nibu.kyiv.ua/' },
];

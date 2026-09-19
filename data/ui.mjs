/*
  Interface wording, both languages.

  This is chrome — navigation, labels, buttons — not content. Ukrainian here
  follows the wording the production site already uses where it has an
  equivalent (Відео / Фото / Дизайн, Умови співпраці, Замовлення, Клієнти),
  so the two sites do not drift apart in vocabulary.
*/
export const UI = {
  selected: { en: 'Selected', ua: 'Обране' },
  photography: { en: 'Photography', ua: 'Фотографія' },
  video: { en: 'Video', ua: 'Відео' },
  design: { en: 'Design', ua: 'Дизайн' },
  street: { en: 'Street photography', ua: 'Вулична фотографія' },
  info: { en: 'About me', ua: 'Про мене' },
  enquiries: { en: 'Enquiries', ua: 'Замовлення' },
  rates: { en: 'Rates &amp; Terms', ua: 'Умови співпраці' },

  menu: { en: 'Menu', ua: 'Меню' },
  close: { en: 'Close', ua: 'Закрити' },
  theme: { en: 'Theme', ua: 'Тема' },
  typeface: { en: 'Type', ua: 'Шрифт' },
  language: { en: 'Language', ua: 'Мова' },
  skip: { en: 'Skip to content', ua: 'Перейти до вмісту' },

  selectedWork: { en: 'Selected work', ua: 'Обрані роботи' },
  practice: { en: 'Practice', ua: 'Практика' },
  projects: { en: 'Projects', ua: 'Проєкти' },
  credits: { en: 'Credits', ua: 'Титри' },
  next: { en: 'Next', ua: 'Далі' },
  client: { en: 'Client', ua: 'Клієнт' },
  role: { en: 'Role', ua: 'Роль' },
  year: { en: 'Year', ua: 'Рік' },
  personal: { en: 'Personal · ongoing', ua: 'Особисте · триває' },
  commercial: { en: 'Commercial', ua: 'Комерція' },

  viewer: { en: 'Image viewer', ua: 'Перегляд світлин' },
  closeViewer: { en: 'Close viewer', ua: 'Закрити перегляд' },
  prev: { en: 'Prev', ua: 'Назад' },
  nextImage: { en: 'Next', ua: 'Далі' },
  prevAria: { en: 'Previous image', ua: 'Попередня світлина' },
  nextAria: { en: 'Next image', ua: 'Наступна світлина' },

  capabilities: { en: 'Capabilities', ua: 'Що роблю' },
  selectedClients: { en: 'Selected clients', ua: 'Обрані клієнти' },
  elsewhere: { en: 'Contacts and profiles', ua: 'Контакти і профілі' },
  direct: { en: 'Direct', ua: 'Напряму' },
  shortBrief: { en: 'Or send a short brief', ua: 'Або надішліть короткий бриф' },
  beforeYouWrite: { en: 'Before you write', ua: 'Перш ніж писати' },
  yourContact: { en: 'Your contact', ua: 'Ваш контакт' },
  contactHint: {
    en: 'Email, Telegram or a phone number — somewhere to reply to',
    ua: 'Пошта, Телеграм або номер телефону — щоб було куди відповісти',
  },
  discipline: { en: 'Discipline', ua: 'Напрямок' },
  deadline: { en: 'Deadline', ua: 'Дедлайн' },
  budget: { en: 'Budget', ua: 'Бюджет' },
  message: { en: 'Message', ua: 'Повідомлення' },
  send: { en: 'Send', ua: 'Надіслати' },
  briefSubject: { en: 'Brief', ua: 'Бриф' },
  briefSending: { en: 'Sending…', ua: 'Надсилаю…' },
  briefSent: {
    en: 'Sent. I reply within a working day — to the contact you left.',
    ua: 'Надіслано. Відповім протягом робочого дня — на контакт, який ви лишили.',
  },
  briefFallback: {
    en: 'The form could not reach me. Your mail app is opening with the brief already written — just press send.',
    ua: 'Форма до мене не достукалася. Зараз відкриється поштова програма з уже написаним брифом — лишиться натиснути «надіслати».',
  },
  briefNoJs: {
    en: 'This form composes an email, which needs JavaScript. Without it, write to the address above.',
    ua: 'Ця форма складає лист, і для цього потрібен JavaScript. Без нього напишіть на адресу вище.',
  },
  moreThanOne: { en: 'More than one', ua: 'Кілька одразу' },
  graphicDesign: { en: 'Graphic design', ua: 'Графічний дизайн' },

  theSequence: { en: 'The sequence', ua: 'Послідовність' },
  notFound: { en: 'This page is not here.', ua: 'Цієї сторінки тут немає.' },
  notFoundTitle: { en: 'Not found', ua: 'Не знайдено' },
  tryInstead: { en: 'Try', ua: 'Спробуйте' },
  kyiv: { en: 'Kyiv, Ukraine', ua: 'Київ, Україна' },
  copyright: { en: '© 2026 Kyrylo Rusanivsky', ua: '© 2026 Кирило Русанівський' },
  moved: { en: 'Moved', ua: 'Переїхало' },
  movedTo: { en: 'This page moved to', ua: 'Ця сторінка переїхала на' },

  name: { en: 'Kyrylo Rusanivsky', ua: 'Кирило Русанівський' },
  splashRole: { en: 'creative specialist', ua: 'креативний спеціаліст' },
  play: { en: 'Play', ua: 'Відтворити' },
  showRest: { en: 'Show the remaining', ua: 'Показати решту' },
  frames: { en: 'frames', ua: 'кадрів' },
  ratesCovers: {
    en: 'covers pricing, timelines, revisions, payment, delivery and rights.',
    ua: 'охоплюють ціни, терміни, правки, оплату, передачу файлів і права.',
  },
};

export const PRACTICE_INTRO = {
  photography: {
    en: 'Reportage, culture and art, backstage and portraits — commissioned work, edited into series rather than delivered as a dump of every frame.',
    ua: 'Репортаж, культура й мистецтво, бекстейдж і портрети — замовна робота, зібрана в серії, а не викладена всіма кадрами поспіль.',
  },
  video: {
    en: 'Camera, editing and colour: documentary, interviews and YouTube series, brand videos and short-form work.',
    ua: 'Камера, монтаж і колір: документалістика, інтерв’ю та YouTube-серії, брендові відео й короткий метр.',
  },
  design: {
    en: 'Book typesetting and layout, cover design, printed matter and prepress for publishers and libraries.',
    ua: 'Верстка книжкових видань, дизайн обкладинок, друкована продукція і допечатна підготовка для видавництв і бібліотек.',
  },
};

export const CAPABILITIES = [
  {
    k: { en: 'Video', ua: 'Відео' },
    v: {
      en: 'Camera, editing, colour. Interviews, YouTube series, short-form and documentary work.',
      ua: 'Камера, монтаж, колір. Інтерв’ю, YouTube-серії, короткий метр і документалістика.',
    },
  },
  {
    k: { en: 'Photography', ua: 'Фотографія' },
    v: {
      en: 'Reportage, culture and art, backstage, portraits.',
      ua: 'Репортаж, культура й мистецтво, бекстейдж, портрети.',
    },
  },
  {
    k: { en: 'Graphic design', ua: 'Графічний дизайн' },
    v: {
      en: 'Book typesetting and layout, cover design, printed matter, prepress.',
      ua: 'Верстка книжкових видань, дизайн обкладинок, друкована продукція, допечатна підготовка.',
    },
  },
];

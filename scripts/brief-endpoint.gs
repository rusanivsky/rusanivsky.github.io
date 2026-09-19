/**
 * Приймач брифа з сайта rusanivsky.com.
 *
 * Сайт лежить на GitHub Pages — це статичні файли, там нема чому виконати
 * відправку. Цей скрипт і є той сервер: він живе у Google-акаунті Кирила,
 * приймає форму і шле лист самому собі. Ніякого стороннього сервісу в
 * ланцюжку немає — бриф клієнта йде з браузера просто в Google.
 *
 * Як розгорнути (робиться один раз):
 *   1. script.google.com → New project, назвати «rusanivsky.com — brief».
 *   2. Вставити цей файл замість вмісту Code.gs, зберегти.
 *   3. Deploy → New deployment → тип Web app.
 *        Execute as:      Me
 *        Who has access:  Anyone            ← саме Anyone, не «Anyone with Google account»
 *   4. Дозволити доступ, коли Google спитає (він скаже «app isn’t verified» —
 *      це ваш власний скрипт, Advanced → Go to project).
 *   5. Скопіювати Web app URL (…/exec) і покласти його в data/brief.json.
 *
 * Після кожної зміни коду треба Deploy → Manage deployments → Edit → New
 * version, інакше працюватиме стара.
 */

/** Куди слати бриф. */
var TO = 'info@rusanivsky.com';

/** Аркуш, куди дублювати заявки. Порожньо — не дублювати нікуди. */
var SHEET_ID = '';

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents || '{}');

    // Пастка для ботів: поле сховане від людини, тож заповнити його міг
    // тільки робот. Відповідаємо «прийнято» і мовчки викидаємо — бот не
    // має дізнатися, що його впізнали.
    if (data.company) return ok();

    var contact = String(data.Contact || '').trim();
    if (!contact) return fail('no contact');

    var order = ['Contact', 'Discipline', 'Deadline', 'Budget', 'Message'];
    var lines = [];
    order.forEach(function (key) {
      var value = String(data[key] || '').trim();
      if (value) lines.push(key + ': ' + value);
    });
    lines.push('', 'Сторінка: ' + (data.page || '—'));

    var subject = 'Бриф' + (data.Discipline ? ' — ' + data.Discipline : '');
    MailApp.sendEmail({
      to: TO,
      subject: subject,
      body: lines.join('\n'),
      // Відповідь піде клієнтові, якщо він лишив пошту; якщо лишив
      // телеграм — replyTo просто не ставимо, лист однаково прийде.
      replyTo: contact.indexOf('@') > 0 ? contact : undefined,
      name: 'rusanivsky.com',
    });

    if (SHEET_ID) {
      SpreadsheetApp.openById(SHEET_ID).getSheets()[0].appendRow(
        [new Date()].concat(order.map(function (k) { return data[k] || ''; }))
      );
    }
    return ok();
  } catch (err) {
    return fail(String(err));
  }
}

/* GET відкривають руками, коли перевіряють, що адреса жива. */
function doGet() {
  return ContentService.createTextOutput('brief endpoint is up');
}

function ok() {
  return ContentService.createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}

function fail(why) {
  return ContentService.createTextOutput(JSON.stringify({ ok: false, error: why }))
    .setMimeType(ContentService.MimeType.JSON);
}

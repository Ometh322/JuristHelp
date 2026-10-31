/* ============================================================
   КОНФИГУРАЦИЯ ТОВАРОВ И ОПЛАТЫ
   ------------------------------------------------------------
   ОПЛАТА ПОДКЛЮЧЕНА: статичный QR-код СБП (НСПК).
   Ссылка staticPayUrl ведёт на платёжную страницу СБП — она
   используется для ВСЕХ товаров сайта.

   ОСОБЕННОСТЬ СТАТИЧНОГО QR:
   - сумма НЕ подставляется автоматически: покупатель вводит её
     вручную в приложении банка (сайт честно об этом предупреждает);
   - автоматической выдачи кодов/файлов нет: после оплаты покупатель
     присылает чек, вы вручную (или через бэкенд) отправляете код
     доступа / файлы. Позже можно перейти на динамические ссылки
     СБП или ЮKassa — они формируются на каждую оплату с суммой.

   Демо-режим (example.com) больше не используется.
   ============================================================ */

const PAYMENT_SETTINGS = {
  currency: '₽',
  // Статичная ссылка QR СБП — используется для всех товаров.
  staticPayUrl: 'https://qr.nspk.ru/AS2A0019F6F836TN8BSBAUQGD92I84R3',
  // Резерв на будущее: если у товара задано своё поле url — используется оно,
  // иначе staticPayUrl. payBaseUrl нужен только если появятся динамические
  // ссылки вида payBaseUrl + id товара.
  payBaseUrl: 'https://example.com/pay/',
  receiverName: 'ООО «Правовой Стандарт»',
  sbpPhone: '+7 (964) 993-65-27', // телефон для связи по чекам
};

const PRODUCTS = {
  /* ---------- УСЛУГИ КОНСУЛЬТАЦИЙ ---------- */
  'u-ustnaya': {
    title: 'Устная консультация юриста (45 минут)',
    price: 2500,
    oldPrice: null,
    unit: 'за консультацию',
    code: 'DEMO-U1',
  },
  'u-pismennaya': {
    title: 'Письменная консультация со ссылками на нормы права',
    price: 6500,
    oldPrice: null,
    unit: 'за документ',
    code: 'DEMO-U2',
  },
  'u-audit': {
    title: 'Правовой аудит документов (до 20 страниц)',
    price: 9900,
    oldPrice: 12000,
    unit: 'за аудит',
    code: 'DEMO-U3',
  },
  'u-dogovor': {
    title: 'Составление договора под вашу задачу',
    price: 7500,
    oldPrice: null,
    unit: 'за договор',
    code: 'DEMO-U4',
  },
  'u-isk': {
    title: 'Составление искового заявления или претензии',
    price: 5900,
    oldPrice: null,
    unit: 'за документ',
    code: 'DEMO-U5',
  },
  'u-sud': {
    title: 'Представительство в суде (одна инстанция)',
    price: 35000,
    oldPrice: null,
    unit: 'за инстанцию',
    code: 'DEMO-U6',
  },
  'u-abonement': {
    title: 'Абонентское обслуживание бизнеса',
    price: 24900,
    oldPrice: null,
    unit: 'в месяц',
    code: 'DEMO-U7',
  },

  /* ---------- ПЛАТНЫЕ СТАТЬИ ---------- */
  'st-1': {
    title: 'Как расторгнуть договор оказания услуг и вернуть деньги',
    price: 249,
    oldPrice: null,
    unit: 'разовый доступ',
    code: 'DEMO-S1',
  },
  'st-2': {
    title: 'Взыскиваем зарплату через суд: пошаговый алгоритм',
    price: 299,
    oldPrice: null,
    unit: 'разовый доступ',
    code: 'DEMO-S2',
  },
  'st-3': {
    title: 'Договор аренды жилья: 10 ловушек, которые дорого обходятся',
    price: 349,
    oldPrice: null,
    unit: 'разовый доступ',
    code: 'DEMO-S3',
  },
  'st-4': {
    title: 'Досудебная претензия, которая работает: структура и образец',
    price: 249,
    oldPrice: null,
    unit: 'разовый доступ',
    code: 'DEMO-S4',
  },
  'st-5': {
    title: 'Защита прав потребителей: как взыскать неустойку по закону',
    price: 299,
    oldPrice: null,
    unit: 'разовый доступ',
    code: 'DEMO-S5',
  },
  'sub-library': {
    title: 'Подписка «Вся библиотека статей»',
    price: 990,
    oldPrice: null,
    unit: 'в месяц, доступ ко всем статьям',
    code: 'DEMO-SUB',
  },

  /* ---------- ШАБЛОНЫ ДОГОВОРОВ ---------- */
  't-uslugi': {
    title: 'Шаблон договора оказания услуг (DOCX + PDF)',
    price: 590,
    oldPrice: null,
    unit: 'за шаблон',
    code: 'DEMO-T1',
  },
  't-arenda': {
    title: 'Шаблон договора аренды квартиры (DOCX + PDF)',
    price: 690,
    oldPrice: null,
    unit: 'за шаблон',
    code: 'DEMO-T2',
  },
  't-trudovoy': {
    title: 'Шаблон трудового договора (DOCX + PDF)',
    price: 590,
    oldPrice: null,
    unit: 'за шаблон',
    code: 'DEMO-T3',
  },
  't-dkp': {
    title: 'Шаблон договора купли-продажи автомобиля (DOCX + PDF)',
    price: 490,
    oldPrice: null,
    unit: 'за шаблон',
    code: 'DEMO-T4',
  },
  't-podryad': {
    title: 'Шаблон договора подряда (DOCX + PDF)',
    price: 690,
    oldPrice: null,
    unit: 'за шаблон',
    code: 'DEMO-T5',
  },
  't-nda': {
    title: 'Шаблон соглашения о конфиденциальности NDA (DOCX + PDF)',
    price: 990,
    oldPrice: null,
    unit: 'за шаблон',
    code: 'DEMO-T6',
  },
  't-zaym': {
    title: 'Шаблон договора займа между физическими лицами (DOCX + PDF)',
    price: 590,
    oldPrice: null,
    unit: 'за шаблон',
    code: 'DEMO-T7',
  },
  't-postavka': {
    title: 'Шаблон договора поставки для бизнеса (DOCX + PDF)',
    price: 1490,
    oldPrice: null,
    unit: 'за шаблон',
    code: 'DEMO-T8',
  },
  't-komplekt': {
    title: 'Полный комплект: все 8 шаблонов со скидкой',
    price: 3900,
    oldPrice: 5220,
    unit: 'за комплект',
    code: 'DEMO-T9',
  },

  /* ---------- ОБУЧАЮЩИЕ КУРСЫ ---------- */
  'k-dogovory': {
    title: 'Курс «Договорная работа для бизнеса»',
    price: 12900,
    oldPrice: 15900,
    unit: 'полный доступ навсегда',
    code: 'DEMO-K1',
  },
  'k-trud': {
    title: 'Курс «Трудовое право для HR и руководителей»',
    price: 8900,
    oldPrice: null,
    unit: 'полный доступ навсегда',
    code: 'DEMO-K2',
  },
  'k-sud': {
    title: 'Курс «Как выиграть суд без юриста»',
    price: 6900,
    oldPrice: null,
    unit: 'полный доступ навсегда',
    code: 'DEMO-K3',
  },
  'k-start': {
    title: 'Курс «Своё дело с нуля: регистрация ИП и ООО»',
    price: 4900,
    oldPrice: null,
    unit: 'полный доступ навсегда',
    code: 'DEMO-K4',
  },
};

/* Технические хелперы — используются main.js. Не редактируйте, если
   не понимаете, что делаете :) */
function getProduct(id) {
  return PRODUCTS[id] || null;
}

function getPayUrl(id) {
  const p = getProduct(id);
  if (!p) return null;
  return p.url || PAYMENT_SETTINGS.staticPayUrl || PAYMENT_SETTINGS.payBaseUrl + id;
}

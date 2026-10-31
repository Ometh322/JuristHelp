/* ============================================================
   Правовой Стандарт — общая логика сайта
   Зависимости: assets/js/vendor/qrcode.min.js, assets/js/payments.js
   ============================================================ */

(function () {
  'use strict';

  /* ---------- Хелперы ---------- */
  function formatPrice(value) {
    return value.toLocaleString('ru-RU') + ' ' + (window.PAYMENT_SETTINGS ? PAYMENT_SETTINGS.currency : '₽');
  }

  function formatPriceFrom(value) {
    return 'от ' + formatPrice(value);
  }

  function toast(message) {
    let el = document.querySelector('.toast');
    if (!el) {
      el = document.createElement('div');
      el.className = 'toast';
      document.body.appendChild(el);
    }
    el.textContent = message;
    el.classList.add('is-visible');
    clearTimeout(el.__timer);
    el.__timer = setTimeout(() => el.classList.remove('is-visible'), 3200);
  }

  /* ---------- Уведомления владельцу (служба на сервере, /api/notify) ----------
     На локальной машине (localhost) уведомления отключены — там нет бэкенда. */
  function notifyOwner(type, subject, body) {
    if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') return;
    try {
      fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: type, subject: subject, body: body }),
      }).catch(function () {});
    } catch (e) { /* уведомление не должно ломать интерфейс */ }
  }

  /* ---------- Шапка: тень при скролле ---------- */
  const header = document.querySelector('.header');
  if (header) {
    const onScroll = () => header.classList.toggle('header--scrolled', window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ---------- Мобильное меню ---------- */
  const burger = document.querySelector('.burger');
  const nav = document.querySelector('.nav');
  if (burger && nav) {
    burger.addEventListener('click', () => {
      const open = nav.classList.toggle('is-open');
      burger.classList.toggle('is-open', open);
      burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    });
    nav.addEventListener('click', (e) => {
      if (e.target.tagName === 'A') {
        nav.classList.remove('is-open');
        burger.classList.remove('is-open');
      }
    });
  }

  /* ---------- Активный пункт меню ---------- */
  const page = (location.pathname.split('/').pop() || 'index.html').replace('.html', '');
  document.querySelectorAll('.nav a[data-page]').forEach((a) => {
    if (a.dataset.page === page || (page === '' && a.dataset.page === 'index')) a.classList.add('is-active');
  });

  /* ---------- QR-коды в карточках ---------- */
  function renderQr(container, text, size) {
    container.innerHTML = '';
    new QRCode(container, {
      text: text,
      width: size,
      height: size,
      colorDark: '#0f2140',
      colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel.M,
    });
  }

  document.querySelectorAll('[data-qr]').forEach((el) => {
    const id = el.getAttribute('data-qr');
    const url = getPayUrl(id);
    if (!url) return;
    renderQr(el, url, el.classList.contains('qr--lg') ? 160 : 120);
    const box = el.closest('.qr-inline');
    if (box) box.addEventListener('click', () => openPayModal(id));
  });

  /* ---------- Модальное окно оплаты ---------- */
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.innerHTML = `
    <div class="modal__card">
      <button class="modal__close" aria-label="Закрыть">×</button>
      <div class="modal__qr-side">
        <div class="modal__qr-frame"><div data-qr-big></div></div>
        <h3 class="modal__title">—</h3>
        <div class="price-big">—</div>
        <p style="font-size:13.5px;color:rgba(255,255,255,.75);margin:0">
          Наведите камеру телефона на QR-код — откроется оплата по СБП
          в вашем банковском приложении.
        </p>
      </div>
      <div class="modal__info">
        <h3>Как получить оплаченный материал</h3>
        <p>Оплата занимает меньше минуты. После подтверждения платежа
           пришлите нам чек — и получите код доступа или файлы.</p>
        <div class="demo-note amount-note">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0">
            <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
          </svg>
          <span>QR-код статичный: в приложении банка введите сумму
          <b class="js-amount">—</b> вручную</span>
        </div>
        <div class="pay-steps">
          <div class="pay-step"><div class="pay-step__num">1</div><div>
            <b>Наведите камеру на QR-код</b>
            <span>или скопируйте ссылку и откройте её на телефоне</span>
          </div></div>
          <div class="pay-step"><div class="pay-step__num">2</div><div>
            <b>Введите сумму и оплатите по СБП</b>
            <span>сумма не подставляется автоматически — точная цифра указана выше слева</span>
          </div></div>
          <div class="pay-step"><div class="pay-step__num">3</div><div>
            <b>Пришлите чек — получите код доступа</b>
            <span>скриншот чека на info@pravo-standart.shop или на телефон +7 (964) 993-65-27 — вышлем код, он откроет материал на этом устройстве</span>
          </div></div>
        </div>
        <div class="modal__actions">
          <button class="btn btn--navy btn--block js-copy-link">Скопировать ссылку на оплату</button>
          <button class="btn btn--gold btn--block js-enter-code">Я оплатил — ввести код доступа</button>
        </div>
        <div class="link-row">Ссылка для оплаты: <code class="js-pay-link">—</code></div>
      </div>
    </div>`;
  document.body.appendChild(modal);

  let currentProduct = null;

  function openPayModal(id) {
    const p = getProduct(id);
    if (!p) return;
    currentProduct = id;
    const url = getPayUrl(id);
    modal.querySelector('.modal__title').textContent = p.title;
    const priceEl = modal.querySelector('.price-big');
    priceEl.innerHTML = formatPriceFrom(p.price) + (p.oldPrice ? '<s>' + formatPrice(p.oldPrice) + '</s>' : '');
    modal.querySelector('.js-pay-link').textContent = url;
    modal.querySelector('.amount-note .js-amount').textContent = formatPrice(p.price);
    renderQr(modal.querySelector('[data-qr-big]'), url, 200);
    modal.classList.add('is-open');
    document.body.style.overflow = 'hidden';

    /* уведомить владельца о попытке оплаты — один раз на товар за сессию */
    try {
      const key = 'pv_notified_' + id;
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, '1');
        notifyOwner('payment_open', p.title,
          'Открыто окно оплаты\nТовар: ' + p.title +
          '\nЦена: от ' + p.price + ' \u20BD' +
          '\nСтраница: ' + location.href);
      }
    } catch (e) {}
  }

  function closePayModal() {
    modal.classList.remove('is-open');
    document.body.style.overflow = '';
  }

  modal.querySelector('.modal__close').addEventListener('click', closePayModal);
  modal.addEventListener('click', (e) => { if (e.target === modal) closePayModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closePayModal(); });

  modal.querySelector('.js-copy-link').addEventListener('click', async () => {
    if (!currentProduct) return;
    const url = getPayUrl(currentProduct);
    try {
      await navigator.clipboard.writeText(url);
      toast('Ссылка на оплату скопирована');
    } catch (e) {
      toast('Скопируйте ссылку вручную: ' + url);
    }
  });

  modal.querySelector('.js-enter-code').addEventListener('click', () => {
    closePayModal();
    const pw = document.querySelector('.paywall');
    if (pw) {
      pw.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => {
        const input = pw.querySelector('.code-form input');
        if (input) input.focus();
      }, 500);
    } else {
      toast('Код доступа придёт на почту после оплаты');
    }
  });

  /* Кнопки «Оплатить» / «Купить» с data-buy */
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-buy]');
    if (btn) openPayModal(btn.getAttribute('data-buy'));
  });

  /* ---------- Пейволл платных статей ---------- */
  const LS_PREFIX = 'pv_access_';

  function isUnlocked(id) {
    try { return localStorage.getItem(LS_PREFIX + id) === '1'; } catch (e) { return false; }
  }

  document.querySelectorAll('.paywall').forEach((pw) => {
    const id = pw.getAttribute('data-product');
    const p = getProduct(id);
    if (!p) return;

    const panel = pw.querySelector('.paywall__panel');
    if (!panel) return;

    const unlock = () => {
      pw.classList.add('paywall--unlocked');
      const note = document.createElement('div');
      note.className = 'unlock-note';
      note.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.1V12a10 10 0 1 1-5.9-9.1"/><path d="M22 4 12 14l-3-3"/></svg><span>Материал оплачен и открыт. Приятного чтения!</span>';
      pw.prepend(note);
      pw.querySelector('.paywall__overlay')?.remove();
    };

    if (isUnlocked(id)) { unlock(); return; }

    /* если панель уже наполнена в HTML — не дублируем */
    if (!panel.dataset.built) {
      panel.innerHTML = `
        <div class="card__icon">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
        </div>
        <h3>Полная версия статьи — ${formatPriceFrom(p.price)}</h3>
        <p>Вы прочитали бесплатное введение. Полная версия содержит пошаговый алгоритм,
           ссылки на статьи законов, типичные ошибки и готовые формулировки.
           Оплатите по QR-коду (СБП) и пришлите чек на info@pravo-standart.shop —
           в ответе получите код доступа, который откроет текст на этом устройстве.</p>
        <button class="btn btn--gold" data-buy="${id}">Оплатить ${formatPriceFrom(p.price)} по QR-коду</button>
        <div class="paywall__or">уже оплачивали?</div>
        <form class="code-form">
          <input type="text" placeholder="Код из письма после оплаты" aria-label="Код доступа">
          <button class="btn btn--navy btn--sm" type="submit">Открыть</button>
        </form>
        <div class="code-form__error">Неверный код. Проверьте письмо после оплаты или напишите нам — поможем.</div>`;
      panel.dataset.built = '1';
    }

    const form = panel.querySelector('.code-form');
    const error = panel.querySelector('.code-form__error');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const value = form.querySelector('input').value.trim().toUpperCase();
      if (value && value === p.code.toUpperCase()) {
        try { localStorage.setItem(LS_PREFIX + id, '1'); } catch (err) {}
        unlock();
        toast('Код принят — статья открыта');
      } else {
        error.classList.add('is-visible');
      }
    });
  });

  /* ---------- Формы заявок: уведомление владельцу + подтверждение ---------- */
  document.querySelectorAll('form[data-lead-form]').forEach((form) => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const lines = [];
      new FormData(form).forEach((value, key) => {
        if (value) lines.push(key + ': ' + value);
      });
      notifyOwner('lead', 'Новая заявка с сайта',
        'Новая заявка с сайта\n' + lines.join('\n') + '\nСтраница: ' + location.href);
      const success = form.parentElement.querySelector('.form-success') || form.querySelector('.form-success');
      form.reset();
      if (success) { form.style.display = 'none'; success.classList.add('is-visible'); }
      toast('Заявка отправлена! Мы свяжемся с вами в рабочее время.');
    });
  });

  /* ---------- Год в футере ---------- */
  document.querySelectorAll('.js-year').forEach((el) => { el.textContent = new Date().getFullYear(); });
})();

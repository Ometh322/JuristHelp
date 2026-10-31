# Служба уведомлений: письма при заявках и попытках оплаты

Сайт статический, поэтому уведомления ходят через мини-службу на ВМ.

## Как работает

- Покупатель открывает окно оплаты (кнопка «Купить»/клик по QR) или отправляет
  форму заявки → JS сайта шлёт POST `/api/notify` на свой домен.
- nginx проксирует `/api/notify` на службу `jurist-notify` (127.0.0.1:8079).
- Служба отправляет письмо на `MAIL_TO` через SMTP вашего почтового ящика.
  Пока SMTP не заполнен — уведомления пишутся в журнал на ВМ
  (`/var/log/jurist-notify.log`), ничего не теряется.

## Установка на ВМ (уже выполнено, для справки)

```bash
sudo mkdir -p /opt/jurist-notify
sudo cp /var/www/juristhelp/tools/notify-service/notify.py /opt/jurist-notify/
sudo cp /var/www/juristhelp/tools/notify-service/jurist-notify.service /etc/systemd/system/
sudo cp /var/www/juristhelp/tools/notify-service/jurist-notify.env /etc/jurist-notify.env
sudo touch /var/log/jurist-notify.log && sudo chown ubuntu:ubuntu /var/log/jurist-notify.log
sudo systemctl daemon-reload && sudo systemctl enable --now jurist-notify
```

В nginx (server 443 домена) добавлен location:

```nginx
    location = /api/notify {
        proxy_pass http://127.0.0.1:8079/notify;
        proxy_set_header X-Real-IP $remote_addr;
    }
```

## Включить реальную отправку писем

SMTP-параметры заполняются в `/etc/jurist-notify.env` на ВМ и применяются
перезапуском: `sudo systemctl restart jurist-notify`.

Для reg.ru (почта на хостинге, как у этого сайта):
- `SMTP_HOST` — **персональный сервер хостинг-аккаунта** вида `smXX.hosting.reg.ru`
  (виден в панели хостинга; для этого сайта — `sm46.hosting.reg.ru`).
  ВАЖНО: `smtp.reg.ru` не существует, а `mx1.hosting.reg.ru` — только входящая
  почта, AUTH на нём не работает;
- `SMTP_PORT=465` (SSL) или `587` (STARTTLS);
- `SMTP_USER` — полный адрес ящика, `SMTP_PASS` — пароль ящика;
- IMAP того же ящика (для проверки доставки): `smXX.hosting.reg.ru:993`.

## Проверка

```bash
curl -s https://pravo-standart.shop/api/notify -H 'Content-Type: application/json' \
  -d '{"type":"lead","subject":"тест","body":"проверка связи"}'
# {"status":"logged"}  — SMTP не настроен, смотрите /var/log/jurist-notify.log
# {"status":"sent"}    — письмо ушло
```

## Ограничения (сознательно)

- Письмо уходит только на фиксированный MAIL_TO (поле получателя из запроса игнорируется).
- Лимит 30 уведомлений в час с одного IP.
- Тип уведомления только `lead` или `payment_open`.

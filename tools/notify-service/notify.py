#!/usr/bin/env python3
# Служба уведомлений сайта pravo-standart.shop
# ------------------------------------------------------------
# Принимает POST /notify с JSON {"type", "subject", "body"} и:
#   - при заполненном SMTP (env) — отправляет письмо на MAIL_TO;
#   - без SMTP — пишет уведомление в журнал NOTIFY_LOG
#     (режим "только журнал", чтобы ничего не терялось).
# Слушает только 127.0.0.1 — наружу смотрит через nginx (/api/notify).
# Только стандартная библиотека Python.

import json
import os
import smtplib
import ssl
import threading
import time
from collections import defaultdict, deque
from datetime import datetime
from email.header import Header
from email.mime.text import MIMEText
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

PORT = int(os.environ.get("NOTIFY_PORT", "8079"))
LOG_FILE = os.environ.get("NOTIFY_LOG", "/var/log/jurist-notify.log")
SMTP_HOST = os.environ.get("SMTP_HOST", "").strip()
SMTP_PORT = int(os.environ.get("SMTP_PORT", "465"))
SMTP_USER = os.environ.get("SMTP_USER", "").strip()
SMTP_PASS = os.environ.get("SMTP_PASS", "").strip()
MAIL_FROM = os.environ.get("MAIL_FROM", SMTP_USER or "notify@pravo-standart.shop")
MAIL_TO = os.environ.get("MAIL_TO", "info@pravo-standart.shop")

MAX_BODY = 4000
RATE_LIMIT = 30   # уведомлений с одного IP...
RATE_WINDOW = 3600  # ...в час

ALLOWED_TYPES = {"lead", "payment_open"}
_hits = defaultdict(deque)
_lock = threading.Lock()


def rate_limited(ip):
    now = time.time()
    with _lock:
        q = _hits[ip]
        while q and now - q[0] > RATE_WINDOW:
            q.popleft()
        if len(q) >= RATE_LIMIT:
            return True
        q.append(now)
        return False


def log_local(subject, body):
    stamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    try:
        with open(LOG_FILE, "a", encoding="utf-8") as f:
            f.write("[%s] %s\n%s\n%s\n" % (stamp, subject, body, "-" * 60))
    except OSError:
        pass


def send_mail(subject, body):
    """Возвращает 'sent' либо 'logged' (если SMTP не настроен)."""
    if not (SMTP_HOST and SMTP_USER and SMTP_PASS):
        return "logged"
    msg = MIMEText(body, "plain", "utf-8")
    msg["Subject"] = Header(subject, "utf-8")
    msg["From"] = MAIL_FROM
    msg["To"] = MAIL_TO
    if SMTP_PORT == 465:
        server = smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, timeout=15,
                                  context=ssl.create_default_context())
    else:
        server = smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=15)
        server.starttls(context=ssl.create_default_context())
    with server:
        server.login(SMTP_USER, SMTP_PASS)
        server.send_message(msg)
    return "sent"


class Handler(BaseHTTPRequestHandler):
    def _json(self, code, payload):
        data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_POST(self):
        if self.path.rstrip("/") != "/notify":
            return self._json(404, {"error": "not found"})
        ip = self.headers.get("X-Real-IP") or self.client_address[0]
        if rate_limited(ip):
            return self._json(429, {"status": "rate_limited"})
        try:
            length = min(int(self.headers.get("Content-Length", "0")), MAX_BODY + 2048)
            payload = json.loads(self.rfile.read(length).decode("utf-8"))
        except Exception:
            return self._json(400, {"error": "bad json"})
        ntype = str(payload.get("type", ""))[:40]
        if ntype not in ALLOWED_TYPES:
            return self._json(400, {"error": "bad type"})
        subject = "[pravo-standart.shop] %s: %s" % (ntype, str(payload.get("subject", ""))[:150])
        body = str(payload.get("body", ""))[:MAX_BODY]
        try:
            status = send_mail(subject, body)
            if status == "logged":
                log_local(subject, body)
        except Exception as e:
            # ошибка SMTP не должна терять уведомление — пишем в журнал
            log_local(subject + " (SMTP ERROR: %s)" % e, body)
            status = "logged"
        return self._json(200, {"status": status})

    def log_message(self, *args):
        pass  # не шумим в journal на каждый запрос


if __name__ == "__main__":
    ThreadingHTTPServer(("127.0.0.1", PORT), Handler).serve_forever()

import smtplib
from email.message import EmailMessage
from app.config import settings,settingsaiui
from typing import Optional


def send_email(to_email: str, subject: str, body: str, plain_body: Optional[str] = None):
    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = settings.EMAIL_FROM
    msg["To"] = to_email

    if plain_body is None:
        import re
        plain_body = re.sub("<[^<]+?>", "", body)

    msg.set_content(plain_body)          # text/plain
    msg.add_alternative(body, subtype="html")  # text/html

    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
        server.ehlo()
        server.starttls()
        server.ehlo()
        server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        server.send_message(msg)

def send_email_aiui(to_email, subject, html):
    msg = EmailMessage()
    msg["From"] = settingsaiui.EMAIL_FROM
    msg["To"] = to_email
    msg["Subject"] = subject
    msg.set_content("HTML version required")
    msg.add_alternative(html, subtype="html")

    host = settingsaiui.SMTP_HOST       # mailcow.bridgeconn.in
    port = settingsaiui.SMTP_PORT       # 587
    user = settingsaiui.SMTP_USER
    pwd  = settingsaiui.SMTP_PASSWORD

    with smtplib.SMTP(host, port, timeout=30) as server:
        server.ehlo()
        server.starttls()
        server.ehlo()
        server.login(user, pwd)
        server.send_message(msg)

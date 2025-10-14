import smtplib
from email.mime.text import MIMEText
from email.message import EmailMessage
from app.config import settings,settingsaiui

def send_email(to_email: str, subject: str, body: str):
    msg = MIMEText(body, "html")
    msg["Subject"] = subject
    msg["From"] = settings.EMAIL_FROM
    msg["To"] = to_email

    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
        server.starttls()
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

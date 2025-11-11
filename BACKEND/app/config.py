import os

class Settings:
    RESET_TOKEN_TTL_MINUTES = int(os.getenv("RESET_TOKEN_TTL_MINUTES", 30))
    FRONTEND_BASE_URL = os.getenv("FRONTEND_BASE_URL", "http://localhost:5173")
    EMAIL_FROM = os.getenv("EMAIL_FROM", "no-reply@example.com")

    #  Add SMTP config
    SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
    SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
    SMTP_USER = os.getenv("SMTP_USER", "")
    SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")

class Settingsaiui:
    RESET_TOKEN_TTL_MINUTES = int(os.getenv("RESET_TOKEN_TTL_MINUTES", 30))
    FRONTEND_AI_UI_BASE_URL = os.getenv("FRONTEND_AI_UI_BASE_URL", "http://localhost:3000")
    EMAIL_FROM = os.getenv("EMAIL_FROM_AI_UI","bcsdev.smtp@bridgeconn.in")
    #  Add SMTP config
    SMTP_HOST = os.getenv("SMTP_HOST_AIUI", "mailcow.bridgeconn.in")
    SMTP_PORT = int(os.getenv("SMTP_PORT_AIUI", 587))
    SMTP_USER = os.getenv("SMTP_USER_AIUI", "")
    SMTP_PASSWORD = os.getenv("SMTP_PASSWORD_AIUI", "")

settings = Settings()
settingsaiui = Settingsaiui()

import os

class Settings:
    RESET_TOKEN_TTL_MINUTES = 30
    FRONTEND_BASE_URL = "https://mt.vachanengine.org"
    EMAIL_FROM = os.getenv("EMAIL_FROM", "no-reply@example.com")

    #  Add SMTP config
    SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
    SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
    SMTP_USER = os.getenv("SMTP_USER", "")
    SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")

settings = Settings()

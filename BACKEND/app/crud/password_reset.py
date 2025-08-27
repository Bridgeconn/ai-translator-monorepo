import secrets, hashlib, datetime as dt
from sqlalchemy.orm import Session
from app.models.password_reset_token import PasswordResetToken
from app.models.users import User
from app.config import settings


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def create_password_reset_token(db: Session, user: User) -> str:
    # Generate secure token
    plaintext = secrets.token_urlsafe(32)
    token_hash = _hash_token(plaintext)

    # Expire old tokens for this user
    db.query(PasswordResetToken).filter(
        PasswordResetToken.user_id == user.user_id,
        PasswordResetToken.used_at.is_(None)
    ).delete(synchronize_session=False)

    # Set expiry
    expires_at = dt.datetime.utcnow() + dt.timedelta(minutes=settings.RESET_TOKEN_TTL_MINUTES)

    # Save to DB
    reset_token = PasswordResetToken(
        user_id=user.user_id,
        token_hash=token_hash,
        expires_at=expires_at,
    )
    db.add(reset_token)
    db.commit()

    return plaintext  # return only plaintext for email link


def verify_password_reset_token(db: Session, plaintext_token: str) -> User | None:
    """Check token validity and return user if valid."""
    token_hash = _hash_token(plaintext_token)
    token_obj = db.query(PasswordResetToken).filter(
        PasswordResetToken.token_hash == token_hash,
        PasswordResetToken.used_at.is_(None),
        PasswordResetToken.expires_at > dt.datetime.utcnow()
    ).first()

    if not token_obj:
        return None

    return token_obj.user


def mark_token_used(db: Session, plaintext_token: str) -> None:
    """Mark a token as used so it cannot be reused."""
    token_hash = _hash_token(plaintext_token)
    token_obj = db.query(PasswordResetToken).filter(
        PasswordResetToken.token_hash == token_hash,
        PasswordResetToken.used_at.is_(None)
    ).first()

    if token_obj:
        token_obj.used_at = dt.datetime.utcnow()
        db.commit()

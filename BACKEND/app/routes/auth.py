from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.dependencies.token import get_current_user
from app.database import get_db
from app.models.users import User
from app.utils.auth import verify_password, create_access_token, get_password_hash
from app.crud import password_reset
from app.utils.email import send_email
from app.config import settings
from app.schemas.auth import (
    TokenResponse,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    ResetPasswordResponse
)

router = APIRouter()


# ---------------- LOGIN ----------------
@router.post("/login", response_model=TokenResponse)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    access_token, jti = create_access_token(data={"sub": str(user.user_id)})
    user.token = access_token
    user.jti = jti
    db.commit()
    return {"access_token": access_token, "token_type": "bearer"}


# ---------------- LOGOUT ----------------
@router.post("/logout")
def logout(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    current_user.jti = None
    db.commit()
    return {"message": "Logged out successfully"}


# ---------------- FORGOT PASSWORD ----------------
@router.post("/forgot-password")
def forgot_password(
    payload: ForgotPasswordRequest,
    bg: BackgroundTasks,
    db: Session = Depends(get_db)
):
    response = {"message": "If the email exists, a reset link has been sent."}
    user = db.query(User).filter(User.email == payload.email.lower()).first()
    if not user:
        return response

    plaintext_token = password_reset.create_password_reset_token(db, user)
    link = f"{settings.FRONTEND_BASE_URL}/reset-password?token={plaintext_token}"

    subject = "Reset your password"
    body = f"Click here to reset your password: {link}"
    bg.add_task(send_email, user.email, subject, body)

    return response


# ---------------- RESET PASSWORD ----------------
@router.post("/reset-password", response_model=ResetPasswordResponse)
def reset_password(
    payload: ResetPasswordRequest,
    db: Session = Depends(get_db)
):
    if payload.new_password != payload.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Passwords do not match",
        )

    user = password_reset.verify_password_reset_token(db, payload.token)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired token",
        )

    user.password_hash = get_password_hash(payload.new_password)

    token_hash = password_reset._hash_token(payload.token)
    token_obj = db.query(password_reset.PasswordResetToken).filter_by(
        token_hash=token_hash,
        user_id=user.user_id,
        used_at=None
    ).first()
    if token_obj:
        from datetime import datetime
        token_obj.used_at = datetime.utcnow()

    db.commit()
    return {"message": "Password has been reset successfully"}

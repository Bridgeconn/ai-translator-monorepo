from pydantic import BaseModel, EmailStr


# ---------------- LOGIN ----------------
class TokenResponse(BaseModel):
    access_token: str
    token_type: str


# ---------------- FORGOT PASSWORD ----------------
class ForgotPasswordRequest(BaseModel):
    email: EmailStr


# ---------------- RESET PASSWORD ----------------
class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str
    confirm_password: str


class ResetPasswordResponse(BaseModel):
    message: str

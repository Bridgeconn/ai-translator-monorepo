from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional
import re
from datetime import datetime
from uuid import UUID


class UserUpdate(BaseModel):
    username: Optional[str] = Field(None, max_length=50)
    email: Optional[EmailStr] = None
    full_name: Optional[str] = Field(None, max_length=100)
    password: Optional[str] = Field(None, min_length=8)
    role: Optional[str] = Field(None, max_length=50)

    @validator("password")
    def validate_password(cls, value):
        if value is None:
            return value
        if not re.search(r"[A-Z]", value):
            raise ValueError("Password must contain at least one uppercase letter.")
        if not re.search(r"[a-zA-Z0-9]", value):
            raise ValueError("Password must be alphanumeric.")
        return value


class UserResponse(BaseModel):
    id: UUID
    username: str
    email: EmailStr
    full_name: Optional[str]
    role: Optional[str]
    created_at: Optional[datetime]
    updated_at: Optional[datetime]
    is_active: bool

    class Config:
        orm_mode = True

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str  # raw password; will be hashed before storing
    full_name: Optional[str] = None
    role: Optional[str] = None

@validator('password')
def validate_password_strength(cls, value):
        if not re.search(r'[A-Z]', value):
            raise ValueError("Password must have at least one uppercase letter.")
        if not re.search(r'[a-z]', value):
            raise ValueError("Password must have at least one lowercase letter.")
        if not re.search(r'[0-9]', value):
            raise ValueError("Password must have at least one number.")
        if not re.search(r'[!@#$%^&*(),.?\":{}|<>]', value):
            raise ValueError("Password must have at least one special character.")
        return value

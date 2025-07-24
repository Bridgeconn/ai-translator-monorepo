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
class LanguageResponse(BaseModel):
    id: UUID
    name: str
    code: str
    created_at: datetime

    class Config:
        orm_mode = True
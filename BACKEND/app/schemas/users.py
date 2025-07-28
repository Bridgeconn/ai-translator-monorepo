from pydantic import BaseModel, EmailStr, field_validator
from uuid import UUID
from datetime import datetime
from app.schemas.base_model import MyBaseModel
import re
from typing import Optional


class UserBase(MyBaseModel):
    username: str
    email: EmailStr
    full_name: str
    is_active: bool

class UserResponse(UserBase):
    id: UUID
    created_at: datetime
    updated_at: datetime




class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str  # raw password; will be hashed before storing
    full_name: Optional[str] = None
    role: Optional[str] = None

@field_validator('password')
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

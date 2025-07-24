import re
from pydantic import BaseModel,EmailStr, validator
from typing import Optional


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

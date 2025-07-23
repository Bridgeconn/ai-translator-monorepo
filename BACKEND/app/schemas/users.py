from pydantic import BaseModel
from typing import Optional


class UserCreate(BaseModel):
    username: str
    email: str
    password: str  # raw password; will be hashed before storing
    full_name: Optional[str] = None
    role: Optional[str] = None


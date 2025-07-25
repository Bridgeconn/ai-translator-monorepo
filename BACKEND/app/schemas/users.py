# Define User Pydantic schemas for data validation and serialization.
from pydantic import BaseModel,EmailStr, validator
from typing import Optional
from datetime import datetime
import uuid

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    full_name: Optional[str] = None
    role: Optional[str] = None
class UserUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    full_name: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None
class UserResponse(BaseModel):
    id: uuid.UUID
    username: str
    email: EmailStr
    full_name: Optional[str] = None
    role: Optional[str] = None
    created_at: datetime
    updated_at: Optional[str] = None
    is_active: bool

    class Config:
        # For Pydantic v2+, use 'model_config = ConfigDict(from_attributes=True)'
        # if you're on FastAPI 0.110 or below (which uses Pydantic v1)
        orm_mode = True  # Allows Pydantic to read data from ORM models
from pydantic import BaseModel, EmailStr
from uuid import UUID
from datetime import datetime
from app.schemas.base_model import MyBaseModel

class UserBase(MyBaseModel):
    username: str
    email: EmailStr
    full_name: str
    is_active: bool

class UserResponse(UserBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

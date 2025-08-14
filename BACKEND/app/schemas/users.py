import re
import uuid
from pydantic import BaseModel,EmailStr, validator,Field
from typing import Optional
from datetime import datetime

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    full_name: Optional[str] = None
    
class UserResponse(BaseModel):
    user_id: uuid.UUID
    username: str
    email: EmailStr
    full_name: Optional[str] = None
    role: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    is_active: bool
    
    class Config:
        orm_mode = True

    class Config:
        orm_mode = True

class UserUpdate(BaseModel):
    username: Optional[str]
    email: Optional[EmailStr]
    full_name: Optional[str]
    password: Optional[str]
    role: Optional[str]
    is_active: Optional[bool]

class SuccessResponse(BaseModel):
    message: str
    data: UserResponse
 
class ErrorResponse(BaseModel):
    message: str

class MessageResponse(BaseModel):
    detail: str
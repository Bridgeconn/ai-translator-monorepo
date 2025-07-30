# Define User Pydantic schemas for data validation and serialization.
from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime
import uuid
class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    full_name: Optional[str] = None
 
class UserUpdate(BaseModel):
    username: Optional[str] = Field(None, max_length=50)
    email: Optional[EmailStr] = None
    full_name: Optional[str] = Field(None, max_length=100)
    password: Optional[str] = Field(None, min_length=8)
    is_active: Optional[bool] = None
    
class UserResponse(BaseModel):
    user_id: uuid.UUID  ## change id to user_id
    username: str
    email: EmailStr
    full_name: Optional[str] = None
    role: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    is_active: bool

    class Config:
        orm_mode = True
 
class SuccessResponse(BaseModel):
    message: str
    data: UserResponse
 
class ErrorResponse(BaseModel):
    message: str


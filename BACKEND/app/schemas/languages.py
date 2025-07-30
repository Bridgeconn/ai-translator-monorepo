from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import uuid

class LanguageCreate(BaseModel):
    name: str
    code: str

class LanguageUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None

class LanguageResponse(BaseModel):
    id: uuid.UUID
    name: str
    code: str
    created_at: datetime

    class Config:
        orm_mode = True

class SuccessResponse(BaseModel):
    message: str
    data: LanguageResponse

class ErrorResponse(BaseModel):
    message: str

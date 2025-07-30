from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import uuid

class LanguageCreate(BaseModel):
    name: str
    BCP_code: str
    ISO_code: str

class LanguageUpdate(BaseModel):
    name: Optional[str] = None
    BCP_code: Optional[str] = None
    ISO_code: Optional[str] = None

class LanguageResponse(BaseModel):
    id: uuid.UUID
    name: str
    BCP_code: str
    ISO_code: str
    created_at: datetime

    class Config:
        orm_mode = True

class SuccessResponse(BaseModel):
    message: str
    data: LanguageResponse

class ErrorResponse(BaseModel):
    message: str

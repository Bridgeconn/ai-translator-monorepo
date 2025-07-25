from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from app.schemas.base_model import MyBaseModel

class LanguageCreate(MyBaseModel):
    name: str
    code: str

class LanguageResponse(LanguageCreate):
    id: UUID
    created_at: datetime

from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import Optional


# 🔹 Base Schema
class VerseTokenTranslationBase(BaseModel):
    project_id: UUID
    verse_id: UUID
    verse_translated_text: Optional[str] = None
    is_reviewed: Optional[bool] = False
    is_active: bool


# 🔹 Create Schema
class VerseTokenTranslationCreate(VerseTokenTranslationBase):
    pass


# 🔹 Update Schema
class VerseTokenTranslationUpdate(BaseModel):
    verse_translated_text: Optional[str] = None
    is_reviewed: Optional[bool] = None
    is_active: Optional[bool] = None


# 🔹 Response Schema
class VerseTokenTranslationOut(VerseTokenTranslationBase):
    verse_token_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True

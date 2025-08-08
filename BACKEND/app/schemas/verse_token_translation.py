from pydantic import BaseModel
from typing import Optional
from uuid import UUID
from datetime import datetime

class VerseTokenTranslationBase(BaseModel):
    project_id: UUID
    verse_id: UUID
    verse_translated_text: Optional[str] = None
    is_reviewed: Optional[bool] = False
    is_active: bool = True

class VerseTokenTranslationCreate(VerseTokenTranslationBase):
    pass

class VerseTokenTranslationUpdate(BaseModel):
    verse_translated_text: Optional[str]
    is_reviewed: Optional[bool]
    is_active: Optional[bool]

class VerseTokenTranslationOut(VerseTokenTranslationBase):
    verse_token_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True

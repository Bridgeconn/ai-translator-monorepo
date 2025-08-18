from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import Optional

#REQUEST schema (for POST): only needs project_id
class VerseTokenTranslationCreate(BaseModel):
    project_id: UUID

class VerseTokenTranslationOut(BaseModel):
    verse_token_id: UUID
    project_id: UUID
    token_text: str
    is_reviewed: bool
    is_active: bool
    created_at: datetime
    updated_at: datetime

class VerseTokenTranslationResponse(BaseModel):
    verse_token_id: UUID
    verse_id: UUID
    project_id: UUID
    token_text: str
    book_name: str
    verse_translated_text: Optional[str] = None
    is_reviewed: bool
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        orm_mode = True

class MessageOnlyResponse(BaseModel):
    message: str

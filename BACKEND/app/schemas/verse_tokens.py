from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import List, Optional

# REQUEST schema (for POST): only needs project_id
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

# For updating manual translation text
class ManualTranslationUpdate(BaseModel):
    translated_text: str

class TranslateChapterRequest(BaseModel):
    verse_numbers: List[int]           # Required list of verses to translate
    model_name: Optional[str] = "nllb-600M"  # Optional, defaults to nllb-600M    
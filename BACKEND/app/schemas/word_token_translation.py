from pydantic import BaseModel
from uuid import UUID
from typing import Optional
from datetime import datetime

# -------------------------
# Word Token Schemas
# -------------------------
class WordTokenBase(BaseModel):
    token_text: str
    frequency: int
    translated_text: Optional[str] = None
    is_reviewed: Optional[bool] = False
    is_active: Optional[bool] = True
    book_id: Optional[UUID] = None


class WordTokenCreate(WordTokenBase):
    project_id: UUID
    book_id: UUID 

class WordTokenUpdate(BaseModel):
    translated_text: Optional[str]
    is_reviewed: Optional[bool]
    is_active: Optional[bool]
    book_id: Optional[UUID] # ✅ Must be a UUID

class WordTokenOut(WordTokenBase):
    word_token_id: UUID
    project_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True

# -------------------------
# Word Token Translation Schemas
# -------------------------
class WordTokenTranslationBase(BaseModel):
    translated_text: str
    source_language: str
    target_language: str

class WordTokenTranslationCreate(WordTokenTranslationBase):
    word_token_id: UUID

class WordTokenTranslationUpdate(BaseModel):
    translated_text: Optional[str]
    source_language: Optional[str]
    target_language: Optional[str]

class WordTokenTranslationResponse(BaseModel):
    word_token_id: UUID
    translated_text: Optional[str]
    source_language: Optional[str] = None
    target_language: Optional[str] = None

    class Config:
        orm_mode = True

class WordTokenTranslationRequest(BaseModel):
    word_token_id: UUID
   

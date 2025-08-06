# app/schemas/word_token_translation.py
from pydantic import BaseModel
from uuid import UUID
from typing import Optional
from datetime import datetime

class WordTokenBase(BaseModel):
    token_text: str
    frequency: int
    translated_text: Optional[str] = None
    is_reviewed: Optional[bool] = False
    is_active: Optional[bool] = True

class WordTokenCreate(WordTokenBase):
    project_id: UUID

class WordTokenUpdate(BaseModel):
    translated_text: Optional[str]
    is_reviewed: Optional[bool]

class WordTokenOut(WordTokenBase):
    word_token_id: UUID
    project_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True

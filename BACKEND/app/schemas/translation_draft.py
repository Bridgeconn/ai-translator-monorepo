
from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import Optional

class GenerateDraftRequest(BaseModel):
    project_id: UUID | int
    book_name: Optional[str] = None

class TranslationDraftBase(BaseModel):
    draft_name: str


class TranslationDraftCreate(TranslationDraftBase):
    project_id: UUID
    book_id: Optional[UUID] = None


class TranslationDraftUpdate(BaseModel):
    draft_name: Optional[str] = None
    content: Optional[str] = None
    format: Optional[str] = None
    file_size: Optional[int] = None
    is_active: Optional[bool] = None


class TranslationDraftOut(BaseModel):
    draft_id: UUID
    project_id: UUID
    book_id: Optional[UUID] = None
    draft_name: str
    content: str
    format: str
    file_size: int
    is_active: bool
    download_count: int
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True

        # Response models
class SourceDraftResponse(BaseModel):
    draft_id: int
    project_id: int
    draft_name: str
    content: str
    format: str
    file_size: int
    created_at: str
    message: str

class DraftContentResponse(BaseModel):
    content: str
    message: str

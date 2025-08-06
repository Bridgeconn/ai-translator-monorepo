from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import Optional

class GenerateDraftRequest(BaseModel):
    project_id: UUID

class TranslationDraftResponse(BaseModel):
    draft_id: UUID
    project_id: UUID
    draft_name: str
    content: str
    format: str
    file_size: int
    download_count: int
    created_at: datetime

    class Config:
        orm_mode = True

class SuccessDraftResponse(BaseModel):
    message: str
    data: TranslationDraftResponse

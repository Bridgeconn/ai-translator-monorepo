from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import List, Optional
# from app.schemas.word_token_translation import WordTokenUpdate
 # 1️⃣ Define UpdatedToken first
class UpdatedToken(BaseModel):
    word_token_id: UUID
    translated_text: str

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
    updated_at: datetime   # add this for frontend to know last modification

 
    class Config:
        orm_mode = True
 
class SuccessDraftResponse(BaseModel):
    message: str
    data: TranslationDraftResponse
class GenerateBookDraftRequest(BaseModel):
    project_id: UUID
    book_id: UUID
class SaveDraftRequest(BaseModel):
    project_id: UUID
    book_id: UUID
    updated_tokens: List[UpdatedToken]      
    content: Optional[str] = None  # optional now
class UpsertDraftRequest(BaseModel):
    project_id: UUID
    book_id: UUID
    content: str
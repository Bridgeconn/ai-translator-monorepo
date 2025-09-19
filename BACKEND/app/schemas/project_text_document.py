from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from uuid import UUID

class ProjectFileData(BaseModel):
    """Schema for individual file data in a project"""
    file_name: str
    source_id: str
    target_id: str
    source_text: str
    target_text: Optional[str] = None

class ProjectTextDocumentCreate(BaseModel):
    """Schema for creating a new text document project"""
    project_name: str
    files: List[ProjectFileData]

class ProjectFileResponse(BaseModel):
    """Schema for file response"""
    id: UUID
    file_name: str
    source_id: str
    target_id: str
    source_text: str
    target_text: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        orm_mode=True

class ProjectTextDocumentResponse(BaseModel):
    """Schema for project response with all files"""
    project_id: UUID
    project_name: str
    project_type: str = "text_document"
    translation_type: str = "text_document"
    files: List[ProjectFileResponse]
    created_at: datetime
    updated_at: datetime

class ProjectSummaryResponse(BaseModel):
    """Schema for project summary (without full file details)"""
    project_id: UUID
    project_name: str
    project_type: str = "text_document"
    translation_type: str = "text_document"
    file_count: int
    created_at: datetime
    updated_at: datetime

from typing import TypeVar, Generic
T = TypeVar('T')

class SuccessResponse(BaseModel, Generic[T]):
    """Generic success response wrapper"""
    message: str
    data: T
class FileUpdate(BaseModel):
    target_text: Optional[str] = None
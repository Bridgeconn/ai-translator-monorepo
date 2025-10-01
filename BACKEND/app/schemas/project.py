from pydantic import BaseModel, Field
from uuid import UUID
from typing import List, Optional,Dict, Any
from datetime import datetime
from typing import Generic, TypeVar
from pydantic.generics import GenericModel


# Base project fields
class ProjectBase(BaseModel):
    name: str
    source_id: UUID
    target_language_id: UUID
    translation_type: str  # "verse", "word", or "text_document"
    selected_books: Optional[List[str]] = None


# Create schema
class ProjectCreate(ProjectBase):
    # only relevant for text_document projects
    file_name: Optional[str] = None  

    class Config:
        orm_mode = True


# Response for normal projects (verse/word)
class ProjectResponse(BaseModel):
    project_id: UUID
    name: str
    source_id: UUID
    target_language_id: UUID
    translation_type: str
    selected_books: Optional[List[str]] = Field(default_factory=list)

    # Defaults
    status: Optional[str] = "created"
    progress: Optional[int] = 0
    total_items: Optional[int] = 0
    completed_items: Optional[int] = 0
    is_active: bool = True

    # Extra fields
    source_language_name: Optional[str]
    target_language_name: Optional[str]
    source_text: Optional[str]

    created_at: Optional[datetime]
    updated_at: Optional[datetime]

    class Config:
        orm_mode = True


# Response for text document projects

class FileResponse(BaseModel):
    file_name: str
    source_text: str
    target_text: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True  # allows parsing from ORM objects

class TextProjectResponse(BaseModel):
    project_id: UUID
    files: List[FileResponse]
    source: Dict[str, Any]
    target: Dict[str, Any]

    class Config:
        orm_mode = True


# Update schema
class ProjectUpdate(BaseModel):
    name: Optional[str]
    source_id: Optional[UUID]
    target_language_id: Optional[UUID]
    translation_type: Optional[str]
    selected_books: Optional[List[str]]
    status: Optional[str]
    progress: Optional[float]
    total_items: Optional[int]
    completed_items: Optional[int]
    is_active: Optional[bool]


# Generic API responses
T = TypeVar("T")

class SuccessResponse(GenericModel, Generic[T]):
    message: str
    data: T

class ErrorResponse(BaseModel):
    message: str

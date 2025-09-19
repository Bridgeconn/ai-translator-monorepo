# schemas.py
from pydantic import BaseModel, Field
from uuid import UUID
from typing import List, Optional
from datetime import datetime

class ProjectBase(BaseModel):
    name: str
    source_id: UUID
    target_language_id: UUID
    translation_type: str
    selected_books: Optional[List[str]]

class ProjectCreate(ProjectBase):
    pass

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

# class ProjectResponse(BaseModel):
#     project_id: UUID
#     name: str
#     source_id: UUID
#     target_language_id: UUID
#     translation_type: str
#     selected_books: Optional[List[str]] = Field(default_factory=list)
#     # Fix the ValidationError by making these optional with defaults
#     status: Optional[str] = "created"
#     progress: Optional[int] = 0
#     total_items: Optional[int] = 0
#     completed_items: Optional[int] = 0
#     is_active: bool = True

#     created_at: Optional[datetime]
#     updated_at: Optional[datetime]

#     class Config:
#         orm_mode = True

from typing import Generic, TypeVar
from pydantic.generics import GenericModel

T = TypeVar("T")

class SuccessResponse(GenericModel, Generic[T]):
    message: str
    data: T

class ErrorResponse(BaseModel):
    message: str

class ProjectResponse(BaseModel):
    project_id: UUID
    name: str
    source_id: UUID
    target_language_id: UUID
    translation_type: str
    selected_books: Optional[List[str]] = Field(default_factory=list)

    # Existing defaults
    status: Optional[str] = "created"
    progress: Optional[int] = 0
    total_items: Optional[int] = 0
    completed_items: Optional[int] = 0
    is_active: bool = True

    #  New fields
    source_language_name: Optional[str]
    target_language_name: Optional[str]
    source_text: Optional[str]

    created_at: Optional[datetime]
    updated_at: Optional[datetime]

    class Config:
        orm_mode = True

# schemas.py
from pydantic import BaseModel
from uuid import UUID
from typing import List, Optional

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

class ProjectResponse(ProjectBase):
    project_id: UUID
    status: str
    progress: float
    total_items: int
    completed_items: int

    class Config:
        orm_mode = True

from typing import Generic, TypeVar
from pydantic.generics import GenericModel

T = TypeVar("T")

class SuccessResponse(GenericModel, Generic[T]):
    message: str
    data: T

class ErrorResponse(BaseModel):
    message: str

# schemas.py
from pydantic import BaseModel
from uuid import UUID
from typing import List, Optional, Union

class ProjectBase(BaseModel):
    name: str
    source_id: UUID
    target_language_id: UUID
    translation_type: str
    selected_books: List[str]
    is_active: bool = True

class ProjectCreate(ProjectBase):
    pass

class ProjectUpdate(BaseModel):
    name: Optional[str]
    translation_type: Optional[str]
    selected_books: Optional[List[str]]
    is_active: Optional[bool]

class ProjectResponse(ProjectBase):
    project_id: UUID
    status: str
    progress: float
    total_items: int
    completed_items: int
    
    @property
    def id(self):
     return self.project_id

    class Config:
        orm_mode = True

# class SuccessResponse(BaseModel):
#     message: str
#     data: Union[ProjectResponse, List[ProjectResponse], None]
from typing import Generic, TypeVar
from pydantic.generics import GenericModel

T = TypeVar("T")

class SuccessResponse(GenericModel, Generic[T]):
    message: str
    data: T

class ErrorResponse(BaseModel):
    message: str

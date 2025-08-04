from pydantic import BaseModel, UUID4, Field
from typing import Optional, List
from decimal import Decimal
from datetime import datetime

# Base schema for shared attributes
class ProjectBase(BaseModel):
    name: str = Field(..., title="Project Name", max_length=255)
    source_id: UUID4 = Field(..., title="Source ID (UUID)")
    target_language_id: UUID4 = Field(..., title="Target Language ID (UUID)")
    translation_type: str = Field(..., title="Type of Translation", max_length=255)
    selected_books: List[str] = Field(..., title="List of Selected Book Codes")
    status: Optional[str] = Field('created', title="Project Status", max_length=255)
    progress: Optional[Decimal] = Field(0, title="Progress % (Decimal)")
    total_items: Optional[int] = Field(0, title="Total Items Count")
    completed_items: Optional[int] = Field(0, title="Completed Items Count")
    is_active: bool = Field(True, title="Is Active")

    class Config:
        orm_mode = True
        anystr_strip_whitespace = True

# Schema for Create API Input
class ProjectCreate(ProjectBase):
    pass  # Inherits everything from ProjectBase (No extra fields)

# Schema for Update API Input (Partial updates allowed)
class ProjectUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=255)
    status: Optional[str] = Field(None, max_length=255)
    progress: Optional[Decimal] = None
    total_items: Optional[int] = None
    completed_items: Optional[int] = None
    is_active: Optional[bool] = None

    class Config:
        orm_mode = True
        anystr_strip_whitespace = True

# Schema for Output Response
class ProjectOut(ProjectBase):
    project_id: UUID4
    created_at: datetime
    updated_at: datetime

from pydantic import BaseModel, UUID4
from typing import Optional
from datetime import datetime

class SourceCreate(BaseModel):
    version_name: str
    version_abbreviation: str
    language_id: UUID4
    description: Optional[str] = None

class SourceUpdate(BaseModel):
    version_name: Optional[str] = None
    version_abbreviation: Optional[str] = None
    language_id: Optional[UUID4] = None
    description: Optional[str] = None

class SourceResponse(BaseModel):
    source_id: UUID4
    version_name: str
    version_abbreviation: str
    language_id: UUID4
    language_name: str
    description: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class SuccessResponse(BaseModel):
    message: str
    data: SourceResponse

class SuccessListResponse(BaseModel):
    message: str
    data: list[SourceResponse]

class ErrorResponse(BaseModel):
    detail: str

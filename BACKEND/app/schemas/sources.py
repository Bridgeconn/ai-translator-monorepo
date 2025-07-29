from pydantic import BaseModel, UUID4
from datetime import datetime
from typing import Optional
from typing import List


class SourceBase(BaseModel):
    source_language: str
    version_name: str
    version_abbreviation: str
    language_id: UUID4

class SourceCreate(SourceBase):
    pass

class SourceUpdate(BaseModel):
    source_language: Optional[str] = None
    version_name: Optional[str] = None
    version_abbreviation: Optional[str] = None
    language_id: Optional[UUID4] = None


class SourceResponse(SourceBase):
    id: UUID4
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True

class SuccessResponse(BaseModel):
    message: str
    data: SourceResponse

class ErrorResponse(BaseModel):
    message: str
class SuccessListResponse(BaseModel):
    message: str
    data: List[SourceResponse]
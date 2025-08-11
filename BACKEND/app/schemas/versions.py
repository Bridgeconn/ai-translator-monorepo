from pydantic import BaseModel
from uuid import UUID
from typing import Optional, Any, List
from datetime import datetime

class VersionCreate(BaseModel):
    version_name: str
    version_abbr: str

class VersionUpdate(BaseModel):
    version_name: Optional[str] = None
    version_abbr: Optional[str] = None
    is_active: Optional[bool] = None

class VersionOut(VersionCreate):
    version_id: UUID
    created_at: datetime
    updated_at: Optional[datetime]
    is_active: bool

    class Config:
        orm_mode = True

class SuccessResponse(BaseModel):
    message: str
    data: Any

class ErrorResponse(BaseModel):
    detail: str

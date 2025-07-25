from pydantic import BaseModel
from uuid import UUID
from datetime import datetime

class LanguageResponse(BaseModel):
    id: UUID
    name: str
    code: str
    created_at: datetime

    class Config:
        orm_mode = True

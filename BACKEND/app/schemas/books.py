# app/schemas/books.py

from pydantic import BaseModel
from typing import Optional
from uuid import UUID
from datetime import datetime
from typing import List


# ✅ CREATE
class BookCreate(BaseModel):
    source_id: UUID
    book_id: str
    usfm_content: str

# ✅ UPDATE
class BookUpdate(BaseModel):   
    book_name: Optional[str]
    book_code: Optional[str]
    book_number: Optional[int]
    testament: Optional[str]
    chapter_count: Optional[int]

# ✅ RESPONSE
class BookResponse(BaseModel):
    book_id: UUID
    source_id: UUID
    book_code: str
    book_name: str
    book_number: int
    testament: str
    usfm_content: str
    created_at: datetime
    updated_at: datetime
    is_active: bool

    class Config:
        orm_mode = True

# ✅ REUSEABLE RESPONSE WRAPPERS
class SuccessResponse(BaseModel):
    message: str
    data: BookResponse

class ErrorResponse(BaseModel):
    message: str

# ✅ USED FOR FILE UPLOAD RESPONSE
class BookUploadResponse(BaseModel):
    book_id: UUID
    book_name: str
    book_code: str
    chapters_created: int
    verses_created: int

class UploadSuccessResponse(BaseModel):
    message: str
    data: BookUploadResponse
class BookListResponse(BaseModel):
    message: str
    data: List[BookResponse]
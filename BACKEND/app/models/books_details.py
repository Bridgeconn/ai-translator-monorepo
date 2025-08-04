from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.sql import func
from app.database import Base

class BookDetail(Base):
    __tablename__ = "book_details"

    book_details_id = Column(Integer, primary_key=True, index=True)
    book_name = Column(String(255), nullable=False)
    book_code = Column(String(255), nullable=False)
    book_number = Column(Integer, nullable=False)
    testament = Column(String(255), nullable=False)
    chapter_count = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    is_active = Column(Boolean, nullable=False, default=True)

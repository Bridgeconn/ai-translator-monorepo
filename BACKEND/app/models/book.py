# models/book.py
from sqlalchemy import Column, String, Text, Integer, ForeignKey, CheckConstraint, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base
from sqlalchemy import Column, DateTime, func
import uuid

class Book(Base):
    __tablename__ = "books"

    book_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    source_id = Column(UUID(as_uuid=True), ForeignKey("sources.source_id"), nullable=False)

    book_code = Column(String(10), nullable=False)
    book_name = Column(String(50), nullable=False)
    book_number = Column(Integer, nullable=False)
    testament = Column(String(2), nullable=False)
    usfm_content = Column(Text, nullable=False)

    uploaded_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    chapters = relationship("Chapter", back_populates="book", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("source_id", "book_code", name="uq_source_book"),
        CheckConstraint("testament IN ('OT', 'NT')", name="check_testament_valid")
    )


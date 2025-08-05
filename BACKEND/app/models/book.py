# models/book.py
from sqlalchemy import Column, String, Text, Integer, ForeignKey, CheckConstraint, UniqueConstraint, DateTime, Boolean, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base
import uuid

class Book(Base):
    __tablename__ = "books"

    book_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, comment="Unique book ID")
    source_id = Column(UUID(as_uuid=True), ForeignKey("sources.source_id", ondelete="CASCADE"), nullable=False, comment="Foreign key to Source")

    book_code = Column(String(10), nullable=False, comment="Book code (e.g., GEN)")
    book_name = Column(String(50), nullable=False, comment="Name of the book")
    book_number = Column(Integer, nullable=False, comment="Book number")
    testament = Column(String(2), nullable=False, comment="Testament (OT/NT)")
    usfm_content = Column(Text, nullable=False, comment="Raw USFM content of the book")
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, comment="Created timestamp")
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False, comment="Last updated timestamp")
    is_active = Column(Boolean, default=True, nullable=False, comment="Active/inactive status")

    chapters = relationship("Chapter", back_populates="book", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("source_id", "book_code", name="uq_source_book"),
        CheckConstraint("testament IN ('OT', 'NT')", name="check_testament_valid"),
    )

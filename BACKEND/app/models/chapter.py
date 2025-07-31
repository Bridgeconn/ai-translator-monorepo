# models/chapter.py
from sqlalchemy import Column, String, Integer, ForeignKey, Text, DateTime, func, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base
import uuid
from sqlalchemy import Column, DateTime, func

class Chapter(Base):
    __tablename__ = "chapters"

    chapter_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    book_id = Column(UUID(as_uuid=True), ForeignKey("books.book_id"), nullable=False)
    chapter_number = Column(Integer, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    book = relationship("Book", back_populates="chapters")
    verses = relationship("Verse", back_populates="chapter", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("book_id", "chapter_number", name="uq_book_chapter"),
    )

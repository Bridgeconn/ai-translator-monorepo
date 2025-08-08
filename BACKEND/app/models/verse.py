from sqlalchemy import Column, Integer, ForeignKey, Text, DateTime, Boolean, func, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base
import uuid

class Verse(Base):
    __tablename__ = "verses"

    verse_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    chapter_id = Column(UUID(as_uuid=True), ForeignKey("chapters.chapter_id"), nullable=False)

    verse_number = Column(Integer, nullable=False)
    content = Column(Text, nullable=False)
    usfm_tags = Column(Text, nullable=False)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    chapter = relationship("Chapter", back_populates="verses")
    verse_token_translations = relationship("VerseTokenTranslation", back_populates="verse")
    
    __table_args__ = (
        UniqueConstraint("chapter_id", "verse_number", name="uq_chapter_verse"),
    )
 
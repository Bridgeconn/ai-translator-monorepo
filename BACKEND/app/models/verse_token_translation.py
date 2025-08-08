
import uuid
from sqlalchemy.orm import relationship
from app.models.verse import Verse
from sqlalchemy import Column, ForeignKey, Text, Boolean, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.database import Base  # or your base class path

class VerseTokenTranslation(Base):
    __tablename__ = "verse_token_translation"

    verse_token_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True),ForeignKey("projects.project_id"),  nullable=False)
    verse_id = Column(UUID(as_uuid=True), ForeignKey("verses.verse_id"), nullable=False)
    
    verse_translated_text = Column(Text, nullable=True)
    is_reviewed = Column(Boolean, default=False)
    is_active = Column(Boolean, nullable=False, default=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    verse = relationship("Verse", back_populates="verse_token_translations")

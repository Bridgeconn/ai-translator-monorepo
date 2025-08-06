from sqlalchemy import Column, ForeignKey, Text, TIMESTAMP, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
from app.database import Base
from sqlalchemy.orm import relationship

class VerseTokenTranslation(Base):
    __tablename__ = 'verse_token_translation'
    
    verse_token_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey('projects.project_id'), nullable=False)
    verse_id = Column(UUID(as_uuid=True), ForeignKey('verses.verse_id'), nullable=False)
    verse_translated_text = Column(Text)
    is_reviewed = Column(Boolean, default=False)
    created_at = Column(TIMESTAMP, default=func.current_timestamp())
    updated_at = Column(TIMESTAMP, default=func.current_timestamp(), onupdate=func.current_timestamp())
    is_active = Column(Boolean, nullable=False)

    # Relationships
    project = relationship("Project", back_populates="verse_tokens")
    verse = relationship("Verse", back_populates="verse_translations")

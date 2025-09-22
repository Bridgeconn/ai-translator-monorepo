from sqlalchemy import DECIMAL, JSON, TIMESTAMP, Column, ForeignKey, Integer, String, DateTime, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
from app.database import Base
from sqlalchemy.orm import relationship

class Project(Base):
    __tablename__ = 'projects'
    
    project_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    source_id = Column(UUID(as_uuid=True), ForeignKey('sources.source_id',ondelete="CASCADE"), nullable=False)
    target_language_id = Column(UUID(as_uuid=True), ForeignKey('languages.language_id'), nullable=False)
    translation_type = Column(String(255), nullable=False)
    selected_books = Column(JSON)
    status = Column(String(255), default='created')
    progress = Column(DECIMAL)
    total_items = Column(Integer)
    completed_items = Column(Integer)
    created_at = Column(TIMESTAMP, default=func.current_timestamp())
    updated_at = Column(TIMESTAMP, default=func.current_timestamp(), onupdate=func.current_timestamp())
    is_active = Column(Boolean, nullable=False)
    owner_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)

    
    # Relationships
    source = relationship("Source", back_populates="projects")
    target_language = relationship("Language", foreign_keys=[target_language_id], back_populates="target_projects")
    word_tokens = relationship("WordTokenTranslation", back_populates="project", cascade="all, delete")
    verse_tokens = relationship("VerseTokenTranslation", back_populates="project", cascade="all, delete")
    # drafts = relationship("TranslationDraft", back_populates="project")
    drafts = relationship("TranslationDraft",back_populates="project",cascade="all, delete-orphan")
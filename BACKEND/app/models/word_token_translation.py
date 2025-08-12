# app/models/word_token_translation.py
from sqlalchemy import Column, String, Integer, Boolean, ForeignKey, Text, TIMESTAMP
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid
from app.database import Base
from app.models.project import Project

class WordTokenTranslation(Base):
    __tablename__ = 'word_token_translation'

    word_token_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey('projects.project_id'))
    book_name = Column(String(255), nullable=False)
    token_text = Column(String(255), nullable=False)
    frequency = Column(Integer, default=1)
    translated_text = Column(Text)
    is_reviewed = Column(Boolean, default=False)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(TIMESTAMP, default=func.current_timestamp())
    updated_at = Column(TIMESTAMP, default=func.current_timestamp(), onupdate=func.current_timestamp())
    
    project = relationship("Project", back_populates="word_tokens")



from sqlalchemy import Column, String, Text, Integer, Boolean, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
from app.database import Base


class TranslationDraft(Base):
    __tablename__ = "translation_draft"

    draft_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.project_id"), nullable=False)
    draft_name = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    format = Column(String, default="usfm")
    file_size = Column(Integer, nullable=False)
    download_count = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
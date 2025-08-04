from sqlalchemy import Column, String, Text, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.database import Base
import uuid

class Source(Base):
    __tablename__ = "sources"

    source_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    version_name = Column(String(100), nullable=False)
    version_abbreviation = Column(String(100), nullable=False)

    language_id = Column(UUID(as_uuid=True), ForeignKey("languages.id", ondelete="RESTRICT"), nullable=False)
    language_name = Column(String(100), nullable=False)  # denormalized field

    description = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

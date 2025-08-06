from sqlalchemy import Column, String, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
from sqlalchemy.orm import relationship

from app.database import Base

class Source(Base):
    __tablename__ = "sources"

    source_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    language_id = Column(UUID(as_uuid=True), ForeignKey("languages.language_id"))
    language_name = Column(String(255), nullable=False)
    version_id = Column(UUID(as_uuid=True), ForeignKey("versions.version_id"))
    version_name = Column(String(255), nullable=False)
    description = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    is_active = Column(Boolean, nullable=False, default=True)
    projects = relationship("Project", back_populates="source")
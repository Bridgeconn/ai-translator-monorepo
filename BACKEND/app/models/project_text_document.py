from sqlalchemy import Column, String, TIMESTAMP, func, Integer, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base
import uuid

class ProjectTextDocument(Base):
    __tablename__ = "project_text_document"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4) # Add unique primary key
    project_id = Column(UUID(as_uuid=True), nullable=False)  # Same for all files in project
    project_name = Column(String, nullable=False)  # Same for all files in project
    project_type = Column(String, nullable=False, default="text_document")  # Project type
    translation_type = Column(String, nullable=False, default="text_document")  # Translation type
    file_name = Column(String, nullable=False)  # Different for each file
    source_id = Column(String, nullable=False)
    target_id = Column(String, nullable=False)
    source_text = Column(String, nullable=False)
    target_text = Column(String, nullable=True)

    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Ensure file names are unique within a project
    __table_args__ = (UniqueConstraint('project_id', 'file_name', name='unique_project_file'),)
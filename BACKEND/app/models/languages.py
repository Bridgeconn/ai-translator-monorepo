from sqlalchemy import Column, String, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
from app.database import Base

class Language(Base):
    __tablename__ = "languages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False)
    BCP_code = Column(String(50), unique=False, nullable=False)
    ISO_code = Column(String(50), unique=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

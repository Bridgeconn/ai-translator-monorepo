# from sqlalchemy import Column, String, Text, Integer, Boolean, ForeignKey, DateTime
# from sqlalchemy.dialects.postgresql import UUID
# from sqlalchemy.sql import func
# import uuid
# from app.database import Base

# class WordTokenTranslation(Base):
#     __tablename__ = "word_token_translation"

#     word_token_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
#     project_id = Column(UUID(as_uuid=True), ForeignKey("projects.project_id"), nullable=False)
#     token_text = Column(String, nullable=False, unique=False)
#     frequency = Column(Integer, default=0)
#     translated_text = Column(Text, nullable=True)
#     is_reviewed = Column(Boolean, default=False)
#     is_active = Column(Boolean, default=True)
#     created_at = Column(DateTime(timezone=True), server_default=func.now())
#     updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

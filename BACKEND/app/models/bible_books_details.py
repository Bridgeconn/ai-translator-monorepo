from sqlalchemy import Column, Integer, String
from app.database import Base

class BibleBookDetail(Base):
    __tablename__ = "bible_books_details"

    book_id = Column(Integer, primary_key=True, index=True)
    book_name = Column(String, nullable=False)
    book_code = Column(String, nullable=False)
    book_number = Column(Integer, nullable=False)
    testament = Column(String, nullable=False)
    chapter_count = Column(Integer, nullable=True)
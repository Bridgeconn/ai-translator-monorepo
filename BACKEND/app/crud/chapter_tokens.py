# from fastapi import logger
# from sqlalchemy.orm import Session
# from app.models.chapter import Chapter
# from app.models.verse import Verse
# from app.models.verse_tokens import VerseTokenTranslation
# from sqlalchemy import asc, cast, Integer
# from uuid import UUID


#Get chapters for a book
# def get_chapters_by_book(db: Session, book_id: str):
#     return (
#         db.query(Chapter)
#         .filter(Chapter.book_id == book_id)
#         .order_by(Chapter.chapter_number)
#         .all()
#     )

# #Get tokens for a chapter (joins Verse → VerseTokenTranslation)
# def get_tokens_by_chapter(db: Session, chapter_id: str, project_id: UUID):
#     # ✅ Add this debug query first
#     chapter = db.query(Chapter).filter(Chapter.chapter_id == chapter_id).first()
#     logger.info(f"Chapter info: {chapter.chapter_number if chapter else 'NOT FOUND'}")
    
#     # Check if ANY tokens exist for this project
#     all_tokens = db.query(VerseTokenTranslation).filter(
#         VerseTokenTranslation.project_id == project_id
#     ).count()
#     logger.info(f"Total tokens for project {project_id}: {all_tokens}")
    
#     # Now do the actual query
#     tokens = (
#         db.query(VerseTokenTranslation)
#         .join(Verse, VerseTokenTranslation.verse_id == Verse.verse_id)
#         .filter(
#             Verse.chapter_id == chapter_id,
#             VerseTokenTranslation.project_id == project_id
#         )
#         .order_by(asc(Verse.verse_number))
#         .all()
#     )
    
#     logger.info(f"Tokens found for chapter {chapter_id}: {len(tokens)}")
    
#     return tokens

from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.models.chapter import Chapter
from app.models.verse import Verse
from app.models.verse_tokens import VerseTokenTranslation
from app.models.book import Book
from app.models.project import Project
from sqlalchemy import asc, cast, Integer
from uuid import UUID
import logging

# ✅ FIX: Use Python's logging module, not fastapi.logger
logger = logging.getLogger(__name__)


# Get chapters for a book
def get_chapters_by_book(db: Session, book_id: str):
    # ✅ Validate book exists
    book = db.query(Book).filter(Book.book_id == book_id).first()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    
    chapters = (
        db.query(Chapter)
        .filter(Chapter.book_id == book_id)
        .order_by(Chapter.chapter_number)
        .all()
    )
    
    if not chapters:
        logger.warning(f"⚠️ No chapters found for book {book.book_name} (book_id={book_id})")
        raise HTTPException(
            status_code=404, 
            detail=f"No chapters found for book '{book.book_name}'. The book may not have been uploaded correctly."
        )
    
    logger.info(f"✅ Found {len(chapters)} chapters for book '{book.book_name}'")
    return chapters


# Get tokens for a chapter (joins Verse → VerseTokenTranslation)
def get_tokens_by_chapter(db: Session, chapter_id: str, project_id: UUID):
    # ✅ Validate chapter exists
    chapter = db.query(Chapter).filter(Chapter.chapter_id == chapter_id).first()
    if not chapter:
        logger.error(f"❌ Chapter not found: {chapter_id}")
        raise HTTPException(status_code=404, detail="Chapter not found")
    
    # ✅ Get the book and verify source
    book = db.query(Book).filter(Book.book_id == chapter.book_id).first()
    if not book:
        logger.error(f"❌ Book not found for chapter: {chapter_id}")
        raise HTTPException(status_code=404, detail="Book not found for this chapter")
    
    project = db.query(Project).filter(Project.project_id == project_id).first()
    if not project:
        logger.error(f"❌ Project not found: {project_id}")
        raise HTTPException(status_code=404, detail="Project not found")
    
    # ✅ Verify source consistency
    if book.source_id != project.source_id:
        logger.error(
            f"❌ Source mismatch: Chapter belongs to source {book.source_id}, "
            f"but project expects {project.source_id}"
        )
        raise HTTPException(
            status_code=400, 
            detail=f"Chapter belongs to a different source. Expected source {project.source_id}, got {book.source_id}"
        )
    
    # Query tokens
    tokens = (
        db.query(VerseTokenTranslation)
        .join(Verse, VerseTokenTranslation.verse_id == Verse.verse_id)
        .filter(
            Verse.chapter_id == chapter_id,
            VerseTokenTranslation.project_id == project_id
        )
        .order_by(asc(Verse.verse_number))
        .all()
    )
    
    logger.info(
        f"📊 Chapter {chapter.chapter_number} (book={book.book_name}): "
        f"Found {len(tokens)} tokens for project {project_id}"
    )
    
    return tokens
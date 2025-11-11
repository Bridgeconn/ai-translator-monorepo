from sqlalchemy.orm import Session
from app.models.chapter import Chapter
from app.models.verse import Verse
from app.models.verse_tokens import VerseTokenTranslation
from sqlalchemy import asc, cast, Integer
from uuid import UUID


#Get chapters for a book
def get_chapters_by_book(db: Session, book_id: str):
    return (
        db.query(Chapter)
        .filter(Chapter.book_id == book_id)
        .order_by(Chapter.chapter_number)
        .all()
    )

#Get tokens for a chapter (joins Verse → VerseTokenTranslation)
def get_tokens_by_chapter(db: Session, chapter_id: str, project_id: UUID):
    tokens = (
        db.query(VerseTokenTranslation)
        .join(Verse, VerseTokenTranslation.verse_id == Verse.verse_id)
        .filter(
            Verse.chapter_id == chapter_id,
            VerseTokenTranslation.project_id == project_id   # ✅ enforce project isolation
        )
        .order_by(
            asc(Verse.chapter_id),
            asc(Verse.verse_number)
        )
        .all()
    )
    return tokens
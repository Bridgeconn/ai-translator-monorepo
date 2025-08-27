from sqlalchemy.orm import Session
from app.models.chapter import Chapter
from app.models.verse import Verse
from app.models.verse_tokens import VerseTokenTranslation

#Get chapters for a book
def get_chapters_by_book(db: Session, book_id: str):
    return (
        db.query(Chapter)
        .filter(Chapter.book_id == book_id)
        .order_by(Chapter.chapter_number)
        .all()
    )

#Get tokens for a chapter (joins Verse → VerseTokenTranslation)
def get_tokens_by_chapter(db: Session, chapter_id: str):
    tokens = (
        db.query(VerseTokenTranslation)
        .join(Verse, VerseTokenTranslation.verse_id == Verse.verse_id)
        .filter(Verse.chapter_id == chapter_id)
        .all()
    )
    return tokens

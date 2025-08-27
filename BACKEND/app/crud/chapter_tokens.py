from sqlalchemy.orm import Session, joinedload
from fastapi import HTTPException
from app.models.book import Book
from app.models.chapter import Chapter
from app.models.verse import Verse
from app.models.verse_tokens import VerseTokenTranslation

# Get chapters by book_id
def get_chapters_by_book(db: Session, book_id: str):
    book = (
        db.query(Book)
        .options(joinedload(Book.chapters))
        .filter(Book.book_id == book_id)
        .first()
    )
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")

    return book.chapters


# Get tokens by chapter_id
def get_tokens_by_chapter(db: Session, chapter_id: str):
    chapter = (
        db.query(Chapter)
        .options(joinedload(Chapter.verses).joinedload(Verse.verse_translations))
        .filter(Chapter.chapter_id == chapter_id)
        .first()
    )
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")

    tokens_response = []
    for verse in chapter.verses:
        for token in verse.verse_translations:
            tokens_response.append({
                "chapter_number": chapter.chapter_number,
                "verse_number": verse.verse_number,
                "token_text": token.token_text,
                "translation": token.verse_translated_text
            })
    return tokens_response

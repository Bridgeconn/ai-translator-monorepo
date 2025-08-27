from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.crud import chapter_tokens as crud

router = APIRouter(prefix="/api", tags=["Chapters & Tokens"])

# 1. Get chapters by book
@router.get("/books/{book_id}/chapters")
def fetch_chapters_by_book(book_id: str, db: Session = Depends(get_db)):
    chapters = crud.get_chapters_by_book(db, book_id)
    return [
        {"chapter_id": str(ch.chapter_id), "chapter_number": ch.chapter_number}
        for ch in chapters
    ]


# 2. Get tokens by chapter
@router.get("/chapters/{chapter_id}/tokens")
def fetch_tokens_by_chapter(chapter_id: str, db: Session = Depends(get_db)):
    return crud.get_tokens_by_chapter(db, chapter_id)

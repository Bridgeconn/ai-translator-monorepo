from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.crud import chapter_tokens as crud
from uuid import UUID

router = APIRouter(prefix="/api", tags=["Chapters & Tokens"])

@router.get("/books/{book_id}/chapters")
def fetch_chapters_by_book(book_id: str, db: Session = Depends(get_db)):
    chapters = crud.get_chapters_by_book(db, book_id)
    return [
        {"chapter_id": str(ch.chapter_id), "chapter_number": ch.chapter_number}
        for ch in chapters
    ]

@router.get("/chapters/{chapter_id}/tokens")
def fetch_tokens_by_chapter(
    chapter_id: str,
    project_id: UUID,                    # ✅ require project_id
    db: Session = Depends(get_db)
):
    tokens = crud.get_tokens_by_chapter(db, chapter_id, project_id)
    if not tokens:
        return {"status": "empty", "message": "No tokens generated for this chapter in this project"}
    return [
        {
            "token_id": str(t.verse_token_id),
            "verse_id": str(t.verse_id),
            "token_text": t.token_text,
            "translated_text": t.verse_translated_text,
        }
        for t in tokens
    ]


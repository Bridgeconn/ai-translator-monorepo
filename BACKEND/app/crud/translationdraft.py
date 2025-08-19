
from sqlalchemy.orm import Session
from uuid import UUID
from fastapi import HTTPException
import io
from fastapi.responses import StreamingResponse
import app.models.translationdraft as models
import app.schemas.translationdraft as schemas
from app.schemas.translationdraft import TranslationDraftCreate
from app.models.verse_tokens import VerseTokenTranslation
from app.models.verse import Verse
from app.models.chapter import Chapter
from app.models.book import Book


def get_all_drafts(db: Session):
    return db.query(models.TranslationDraft).all()

def get_draft_by_id(db: Session, draft_id: UUID):
    draft = db.query(models.TranslationDraft).filter(models.TranslationDraft.draft_id == draft_id).first()
    if not draft:
        raise HTTPException(status_code=404, detail="Draft not found")
    return draft

def get_drafts_by_project_id(db: Session, project_id: UUID):
    return db.query(models.TranslationDraft).filter(models.TranslationDraft.project_id == project_id).all()

def get_drafts_by_book_id(db: Session, book_id: UUID):
    return db.query(models.TranslationDraft).filter(models.TranslationDraft.book_id == book_id).all()

def create_draft(db: Session, draft_data: schemas.TranslationDraftCreate):
    # 1. Fetch all verse translations linked to the given project and book
    tokens = (
        db.query(VerseTokenTranslation)
        .join(Verse, VerseTokenTranslation.verse_id == Verse.verse_id)
        .join(Chapter, Verse.chapter_id == Chapter.chapter_id)
        .join(Book, Chapter.book_id == Book.book_id)
        .filter(
            VerseTokenTranslation.project_id == draft_data.project_id,
            Book.book_id == draft_data.book_id,
            VerseTokenTranslation.is_active == True,
            VerseTokenTranslation.verse_translated_text.isnot(None),
        )
        .all()
    )

    # 2. Merge translations into draft content
    translated_content = "\n".join(
        [t.verse_translated_text for t in tokens if t.verse_translated_text]
    )

    # 3. Estimate file size
    file_size = len(translated_content.encode("utf-8"))

    # 4. Create draft entry
    new_draft = models.TranslationDraft(
        project_id=draft_data.project_id,
        draft_name=draft_data.draft_name,
        content=translated_content,
        format="usfm",
        file_size=file_size,
        book_id=draft_data.book_id,
    )

    db.add(new_draft)
    db.commit()
    db.refresh(new_draft)

    return new_draft
def update_draft(db: Session, draft_id: UUID, draft_data: schemas.TranslationDraftUpdate):
    draft = get_draft_by_id(db, draft_id)
    for key, value in draft_data.dict(exclude_unset=True).items():
        setattr(draft, key, value)
    db.commit()
    db.refresh(draft)
    return draft

def download_draft(db: Session, draft_id: UUID):
    draft = get_draft_by_id(db, draft_id)
    draft.download_count += 1
    db.commit()

    file_stream = io.BytesIO(draft.content.encode("utf-8"))
    return StreamingResponse(file_stream, media_type="application/octet-stream",
                             headers={"Content-Disposition": f"attachment; filename={draft.draft_name}.usfm"})

def delete_draft(db: Session, draft_id: UUID):
    draft = get_draft_by_id(db, draft_id)
    db.delete(draft)
    db.commit()
    return {"message": "Draft deleted successfully"}

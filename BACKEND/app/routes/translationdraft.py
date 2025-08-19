from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from uuid import UUID
import app.crud.translationdraft as crud
import app.schemas.translationdraft as schemas
from app.database import get_db

router = APIRouter(tags=["Translation Drafts"])

@router.get("/", response_model=list[schemas.TranslationDraftOut])
def get_all_drafts(db: Session = Depends(get_db)):
    return crud.get_all_drafts(db)

@router.get("/{draft_id}", response_model=schemas.TranslationDraftOut)
def get_draft_by_id(draft_id: UUID, db: Session = Depends(get_db)):
    return crud.get_draft_by_id(db, draft_id)

@router.get("/by-project/{project_id}", response_model=list[schemas.TranslationDraftOut])
def get_drafts_by_project(project_id: UUID, db: Session = Depends(get_db)):
    return crud.get_drafts_by_project_id(db, project_id)

@router.get("/by-book/{book_id}", response_model=list[schemas.TranslationDraftOut])
def get_drafts_by_book(book_id: UUID, db: Session = Depends(get_db)):
    return crud.get_drafts_by_book_id(db, book_id)

@router.post("/", response_model=schemas.TranslationDraftOut)
def create_draft(draft: schemas.TranslationDraftCreate, db: Session = Depends(get_db)):
    return crud.create_draft(db, draft)

@router.put("/{draft_id}", response_model=schemas.TranslationDraftOut)
def update_draft(draft_id: UUID, draft_data: schemas.TranslationDraftUpdate, db: Session = Depends(get_db)):
    return crud.update_draft(db, draft_id, draft_data)

@router.get("/download/{draft_id}")
def download_draft(draft_id: UUID, db: Session = Depends(get_db)):
    return crud.download_draft(db, draft_id)

@router.delete("/{draft_id}")
def delete_draft(draft_id: UUID, db: Session = Depends(get_db)):
    return crud.delete_draft(db, draft_id)

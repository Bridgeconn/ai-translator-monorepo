//routes
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.translation import SuccessDraftResponse, GenerateDraftRequest,GenerateBookDraftRequest,TranslationDraftResponse
from app.crud.translation import translation_service,get_latest_draft
from uuid import UUID
router = APIRouter(prefix="/translation")

@router.post("/generate", response_model=SuccessDraftResponse, status_code=status.HTTP_201_CREATED)
def generate_draft(req: GenerateDraftRequest, db: Session = Depends(get_db)):
    draft = translation_service.generate_draft(db, req.project_id)
    return {"message": "Draft generated successfully", "data": draft}

@router.post("/generate/book", response_model=SuccessDraftResponse, status_code=status.HTTP_201_CREATED)
def generate_draft_for_book(req: GenerateBookDraftRequest, db: Session = Depends(get_db)):
    draft = translation_service.generate_draft_for_book(db, req.project_id, req.book_name)
    return {"message": f"Draft for book '{req.book_name}' generated successfully", "data": draft}
@router.get("/drafts/latest", response_model=TranslationDraftResponse)
def read_latest_draft(project_id: UUID, book_name: str, db: Session = Depends(get_db)):
    """
    Get the latest draft for a given project and book
    """
    draft = get_latest_draft(db, project_id, book_name)
    return draft
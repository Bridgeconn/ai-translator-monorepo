from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID
from app.database import get_db
from app.schemas.translation import (
    UpsertDraftRequest,
    SuccessDraftResponse,
    GenerateDraftRequest,
    GenerateBookDraftRequest,
    TranslationDraftResponse,
     # ✅ use the correct schema name
)
from app.crud.translation import translation_service
from app.schemas.translation import SaveDraftRequest
router = APIRouter()
 
# ------------------ Generate draft ------------------
@router.post("/generate", response_model=SuccessDraftResponse, status_code=status.HTTP_201_CREATED)
def generate_draft(req: GenerateDraftRequest, db: Session = Depends(get_db)):
    draft = translation_service.generate_draft(db, req.project_id)
    return {"message": "Draft generated successfully", "data": draft}

@router.post("/generate/book", response_model=SuccessDraftResponse, status_code=status.HTTP_201_CREATED)
def generate_draft_for_book(req: GenerateBookDraftRequest, db: Session = Depends(get_db)):
    draft = translation_service.generate_draft_for_book(db, req.project_id, req.book_id) # ✅ Changed to req.book_id
    return {"message": f"Draft for book '{req.book_id}' generated successfully", "data": draft}
 
@router.get("/latest", response_model=TranslationDraftResponse)
def read_latest_draft(project_id: UUID, book_id: UUID, db: Session = Depends(get_db)):
    """
    Get the latest draft for a given project and book.
    """
    draft = translation_service.get_latest_draft(db, project_id, book_id)
    if not draft:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No draft found for this project and book."
        )
    return draft
@router.put("/word_tokens/save")
def save_tokens(
    request: SaveDraftRequest,
    db: Session = Depends(get_db)
):
    result = translation_service.save_tokens_for_book(
        db=db,
        project_id=request.project_id,
        book_id=request.book_id,
        updated_tokens=[t.dict() for t in request.updated_tokens],
        
    )
    return {
        "message": "Tokens updated successfully",
        "updated_tokens": result["updated_tokens"],
        "content": result.get("content", "")  # return rebuilt content too
    }
# ------------------ Save Manual Draft (New Route) ------------------
@router.put("/save", status_code=status.HTTP_200_OK)
def save_manual_draft(req: UpsertDraftRequest, db: Session = Depends(get_db)):
    """
    Save a manually edited draft, creating a new version.
    """
    try:
        new_draft = translation_service.upsert_manual_draft(db, req.project_id, req.book_id, req.content)
        return {"message": "Manual draft saved successfully", "draft": new_draft}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save manual draft: {e}")


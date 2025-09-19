from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.crud.verse_draft import TranslationService
from app.database import get_db
from app.schemas.translation_draft import GenerateDraftRequest, SourceDraftResponse
from fastapi.responses import StreamingResponse
from io import BytesIO
 
from app.models.translation_draft import TranslationDraft
from app.schemas.translation_draft import UpdateDraftRequest, SourceDraftResponse
from uuid import UUID
from datetime import datetime
 
router = APIRouter()
 
translation_service = TranslationService()
 
@router.post("/generate-draft/")
def generate_draft(req: GenerateDraftRequest, db: Session = Depends(get_db)):
    """
    Generate a new translation draft by replacing verses in source USFM
    with translations from verse_token_translation table.
    """
    try:
        # draft = translation_service.generate_draft_from_verses(db, req.project_id)
        draft = translation_service.generate_draft_from_verses(
    db, req.project_id, req.book_name
)
 
 
        if not draft or not draft.content:
            raise HTTPException(status_code=404, detail="Draft content not found")
 
        usfm_bytes = BytesIO(draft.content.encode("utf-8"))
        filename = f"{draft.draft_name or 'translated_draft'}.usfm"
 
        return StreamingResponse(
            usfm_bytes,
            media_type="text/plain",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
 
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating draft: {str(e)}")
@router.post("/generate-draft-json/")
def generate_draft_json(req: GenerateDraftRequest, db: Session = Depends(get_db)):
    """
    Generate a draft for frontend editing (returns JSON with draft_id and content)
    """
    try:
        draft = translation_service.generate_draft_from_verses(
            db, req.project_id, req.book_name
        )

        if not draft or not draft.content:
            raise HTTPException(status_code=404, detail="Draft content not found")

        # Return JSON instead of streaming file
        return {
            "draft_id": str(draft.draft_id),
            "draft_name": draft.draft_name,
            "content": draft.content,
            "format": draft.format,
        }

    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating draft: {str(e)}")

 
@router.post("/generate-draft-content/")
def generate_draft_content(req: GenerateDraftRequest, db: Session = Depends(get_db)):
    """
    Generate a new translation draft and return the content directly (not as download).
    """
    try:
        draft = translation_service.generate_draft_from_verses(db, req.project_id)
 
        if not draft or not draft.content:
            raise HTTPException(status_code=404, detail="Draft content not found")
 
        return SourceDraftResponse(
            draft_id=draft.draft_id,
            project_id=draft.project_id,
            draft_name=draft.draft_name,
            content=draft.content,
            format=draft.format,
            file_size=draft.file_size,
            created_at=draft.created_at.isoformat(),
            message="Translation draft generated successfully with verse translations"
        )
 
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating draft: {str(e)}")
 
@router.put("/drafts/{draft_id}")
def update_draft(draft_id: UUID, req: UpdateDraftRequest, db: Session = Depends(get_db)):
    draft = translation_service.update_draft(db, draft_id, req.content)
 
    return SourceDraftResponse(
        draft_id=draft.draft_id,
        project_id=draft.project_id,
        draft_name=draft.draft_name,
        content=draft.content,
        format=draft.format,
        file_size=draft.file_size,
        created_at=draft.created_at.isoformat(),
        message="Draft updated successfully"
    )
 
@router.get("/drafts/latest/{project_id}/{book_name}")
def get_latest_draft(project_id: UUID, book_name: str, db: Session = Depends(get_db)):
    """
    Fetch the latest draft for a given project + book.
    """
    draft = (
        db.query(TranslationDraft)
        .filter(TranslationDraft.project_id == project_id)
        .filter(TranslationDraft.draft_name.like(f"{book_name}_%"))  # ensures book-wise
        .order_by(TranslationDraft.created_at.desc())
        .first()
    )
    if not draft:
        raise HTTPException(status_code=404, detail="No draft found for this book")

    return draft

 
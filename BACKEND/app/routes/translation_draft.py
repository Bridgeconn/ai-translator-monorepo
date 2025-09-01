from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.crud.verse_draft import TranslationService
from app.database import get_db
from app.schemas.translation_draft import GenerateDraftRequest, SourceDraftResponse
from fastapi.responses import StreamingResponse
from io import BytesIO

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

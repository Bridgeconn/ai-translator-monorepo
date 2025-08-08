import re
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.crud.translation_service import TranslationService
from app.database import get_db
from app.schemas.translation import GenerateDraftRequest, SuccessDraftResponse
from app.models.translationdraft import TranslationDraft
from app.models.verse_token_translation import VerseTokenTranslation
from app.models.books import Book
from app.models.project import Project
from fastapi.responses import StreamingResponse
from io import BytesIO
router = APIRouter()
@router.post("/generate-draft/")
def generate_draft(req: GenerateDraftRequest, db: Session = Depends(get_db)):
    translation_service = TranslationService()
    draft = translation_service.generate_draft_from_verses(db, req.project_id)

    if not draft or not draft.content:
        raise HTTPException(status_code=404, detail="Draft content not found")

    # Convert content to BytesIO for download
    usfm_bytes = BytesIO(draft.content.encode("utf-8"))

    filename = f"{draft.draft_name or 'draft'}.usfm"

    return StreamingResponse(
        usfm_bytes,
        media_type="text/plain",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


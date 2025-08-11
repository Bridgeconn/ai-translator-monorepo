from fastapi import APIRouter, Depends, HTTPException
from app.database import get_db
from sqlalchemy.orm import Session
from uuid import UUID
from app.crud.verse_token_translation import create_verse_tokens_for_project, manual_update_translation, translate_verse_token
from app.schemas.project import SuccessResponse

from app.models.verse_token_translation import VerseTokenTranslation
from app.schemas.verse_token_translation import ManualTranslationUpdate, VerseTokenTranslationResponse, MessageOnlyResponse
from typing import List

from app.crud.verse_token_translation import get_verse_token_by_id

router = APIRouter()

@router.post(
    "/generate-verse-tokens/{project_id}",
    response_model=MessageOnlyResponse   
)
def generate_verse_tokens(project_id: UUID, db: Session = Depends(get_db)):
    tokens = create_verse_tokens_for_project(db, project_id)
    return {
        "message": f"{len(tokens)} verse tokens created successfully."
    }

@router.get("/verse-token-translations/by-project/{project_id}", response_model=List[VerseTokenTranslationResponse])
def get_tokens_by_project(project_id: UUID, db: Session = Depends(get_db)):
    tokens = db.query(VerseTokenTranslation).filter(VerseTokenTranslation.project_id == project_id).all()
    
    if not tokens:
        raise HTTPException(status_code=404, detail="No verse tokens found for this project.")
    
    return tokens
@router.get("/verse-token-translations/by-id/{verse_token_id}")
def get_verse_token(verse_token_id: UUID, db: Session = Depends(get_db)):
    token = get_verse_token_by_id(db, verse_token_id)
    return {
        "message": "Verse token retrieved successfully.",
        "data": {
            "verse_token_id": token.verse_token_id,
            "token_text": token.token_text
        }
    }

@router.post(
    "/translate-verse-token/{verse_token_id}",
    response_model=VerseTokenTranslationResponse
)
def translate_single_token(
    verse_token_id: UUID,
    db: Session = Depends(get_db)
):
    """
    Translate a single verse token using Vachan AI (auto-fetch languages from project).
    """
    from app.crud import verse_token_translation as verse_token_crud

    token_obj = verse_token_crud.translate_verse_token(
        db=db,
        verse_token_id=verse_token_id
    )
    return token_obj

@router.patch("/manual-update/{verse_token_id}")
def manual_update_translation_route(
    verse_token_id: UUID,
    update: ManualTranslationUpdate,
    db: Session = Depends(get_db)
):
    updated_token = manual_update_translation(db, verse_token_id, update.translated_text)
    return {"message": "Translation updated successfully", "data": updated_token}
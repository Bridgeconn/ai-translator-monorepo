from fastapi import APIRouter, Depends, HTTPException
from app.database import get_db
from sqlalchemy.orm import Session
from uuid import UUID
from app.crud.verse_token_translation import create_verse_tokens_for_project
from app.schemas.project import SuccessResponse

from app.models.verse_token_translation import VerseTokenTranslation
from app.schemas.verse_token_translation import VerseTokenTranslationResponse, MessageOnlyResponse
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
    return {"message": "Verse token retrieved successfully.", "data": token}

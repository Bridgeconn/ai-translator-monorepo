# app/routes/word_token_translation.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from uuid import UUID
from typing import List
from app.schemas.word_token_translation import WordTokenOut, WordTokenUpdate
from app.crud import word_token_translation as crud
from app.database import get_db
from app.schemas.word_token_translation import WordTokenTranslationRequest, WordTokenTranslationResponse
from app.crud.word_token_translation import translate_and_store_word_token
router = APIRouter(
    prefix="/api/word_token_translation",
    tags=["Word Token Translation"]
)
@router.get("/project/{project_id}", response_model=List[WordTokenOut])
def get_word_tokens(project_id: UUID, db: Session = Depends(get_db)):
    return crud.get_tokens_by_project(db, project_id)

@router.put("/{word_token_id}", response_model=WordTokenOut)
def update_token(word_token_id: UUID, update: WordTokenUpdate, db: Session = Depends(get_db)):
    updated = crud.update_translation(db, word_token_id, update)
    if not updated:
        raise HTTPException(status_code=404, detail="Token not found")
    return updated

@router.post("/translate", response_model=WordTokenTranslationResponse)
def translate_word_token(data: WordTokenTranslationRequest, db: Session = Depends(get_db)):
    """
    Translate a word token using Vachan AI and return the result.
    """
    return translate_and_store_word_token(db, data)

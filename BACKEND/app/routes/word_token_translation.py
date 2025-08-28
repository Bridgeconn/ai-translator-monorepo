from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from uuid import UUID
from typing import List
from app.crud import word_token_translation as crud
from app.database import get_db
from app.schemas.word_token_translation import WordTokenTranslationRequest, WordTokenTranslationResponse,WordTokenOut,WordTokenUpdate
router = APIRouter()

@router.put("/{word_token_id}", response_model=WordTokenOut)
def update_token(word_token_id: UUID, update: WordTokenUpdate, db: Session = Depends(get_db)):
    updated = crud.update_translation(db, word_token_id, update)
    if not updated:
        raise HTTPException(status_code=404, detail="Token not found")
    return updated

@router.post("/translate", response_model=WordTokenOut)
def translate_word_token(data: WordTokenTranslationRequest, db: Session = Depends(get_db)):
    """
    Translate a word token using Vachan AI and return the result.
    """
    return crud.translate_and_store_word_token(db, data)
@router.post("/generate_batch/{project_id}", response_model=List[WordTokenOut])
def generate_batch(
    project_id: UUID,
    book_name: str = Query(..., description="Book name for which to translate tokens"),
    db: Session = Depends(get_db)
):
    print(">>> Entered generate_batch route")
    print("Project ID:", project_id)
    print("Book Name:", book_name)
 
    tokens = crud.generate_tokens_batch(db, project_id, book_name)
    print("Tokens returned from CRUD:", tokens)
 
    if not tokens:
        raise HTTPException(status_code=404, detail="No translated tokens found for this project/book")
    return tokens
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from uuid import UUID
import traceback
from typing import Optional
from typing import List
from app.schemas.word_token_translation import WordTokenOut
from app.database import get_db
from app.crud.word_tokens import extract_and_store_word_tokens, get_tokens_all, get_token_by_project_and_text

router = APIRouter()

@router.post("/generate/{project_id}")
def generate_word_tokens(project_id: UUID, book_name: str, db: Session = Depends(get_db)):
    try:
        extract_and_store_word_tokens(db, project_id, book_name)
        return {"message": "Word tokens generated and stored with frequency."}
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/project/{project_id}/token/{token_text}")
def get_token_by_project_token_text(project_id: UUID, token_text: str, db: Session = Depends(get_db)):
    token = get_token_by_project_and_text(db, project_id, token_text)
    if not token:
        raise HTTPException(status_code=404, detail="Token not found")
    return token

@router.get("/project/{project_id}", response_model=List[WordTokenOut])
def get_all_tokens(project_id: UUID, book_name: Optional[str] = None, db: Session = Depends(get_db)):
    return get_tokens_all(db, project_id, book_name)

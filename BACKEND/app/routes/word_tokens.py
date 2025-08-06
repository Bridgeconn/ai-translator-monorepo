from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from uuid import UUID
import traceback

from app.database import get_db
from app.crud.word_tokens import extract_and_store_word_tokens
from app.crud.word_tokens import get_token_by_project_and_text


router = APIRouter(
    prefix="/word_tokens",
    tags=["Word Tokens"]
)

@router.post("/generate/{project_id}")
def generate_word_tokens(project_id: UUID, db: Session = Depends(get_db)):
    try:
        extract_and_store_word_tokens(db, project_id)
        return {"message": "Word tokens generated and stored with frequency."}
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        traceback.print_exc()  # logs full error in console
        raise HTTPException(status_code=500, detail=str(e))
@router.get("/project/{project_id}/token/{token_text}")
def get_token_by_project_token_text(project_id: UUID, token_text: str, db: Session = Depends(get_db)):
    token = get_token_by_project_and_text(db, project_id, token_text)
    if not token:
        raise HTTPException(status_code=404, detail="Token not found")
    return token

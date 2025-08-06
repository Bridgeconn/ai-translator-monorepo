# app/routes/word_tokens.py

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from uuid import UUID
from app.crud.word_tokens import extract_and_store_word_tokens

router = APIRouter(prefix="/word_tokens", tags=["Word Tokens"])

@router.post("/generate/{project_id}")
def generate_word_tokens(project_id: UUID, db: Session = Depends(get_db)):
    extract_and_store_word_tokens(db, project_id)
    return {"message": "Word tokens generated and stored."}

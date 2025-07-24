from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.schemas.schemas import LanguageResponse
from app.database import get_db
from app.crud import languages as crud_language

router = APIRouter()

@router.get("/languages/", response_model=List[LanguageResponse])
def fetch_all_languages(db: Session = Depends(get_db)):
    return crud_language.get_all_languages(db)

@router.get("/languages/{code}", response_model=LanguageResponse)
def fetch_language_by_code(code: str, db: Session = Depends(get_db)):
    language = crud_language.get_language_by_code(db, code)
    if not language:
        raise HTTPException(status_code=404, detail="Language not found")
    return language

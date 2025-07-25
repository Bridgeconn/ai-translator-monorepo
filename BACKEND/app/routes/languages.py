from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.languages import LanguageCreate, LanguageResponse
from app.crud import languages as language_ops
from typing import List

router = APIRouter(prefix="/languages", tags=["Languages"])

# List all languages
@router.post("/", response_model=LanguageResponse)
def create_language(language: LanguageCreate, db: Session = Depends(get_db)):
    existing = language_ops.get_language_by_code(db, language.code)
    if existing:
        raise HTTPException(status_code=400, detail="Language code already exists")
    return language_ops.create_language(db, language)


# get language by code
@router.get("/{code}", response_model=LanguageResponse)
def get_language_by_code(code: str, db: Session = Depends(get_db)):
    language = language_ops.get_language_by_code(db, code)
    if not language:
        raise HTTPException(status_code=404, detail="Language not found")
    return language

# get languages by name
# @router.get("/{name}", response_model=LanguageResponse)
@router.get("/by-name/{name}", response_model=LanguageResponse)
def get_language_by_name(name: str, db: Session = Depends(get_db)):
    language = language_ops.get_language_by_name(db, name)
    if not language:
        raise HTTPException(status_code=404, detail="Language not found")
    return language

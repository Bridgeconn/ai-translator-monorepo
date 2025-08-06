from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from uuid import UUID
from typing import List
from app.schemas.project import SuccessResponse  # ✅ This will work!
# from app.schemas import SuccessResponse 
from app.schemas.verse_token_translation import (
    VerseTokenTranslationCreate,
    VerseTokenTranslationUpdate,
    VerseTokenTranslationOut
)
from app.database import get_db
from app.crud import verse_token_translation as crud
from app.dependencies.token import get_current_user
from app.models.users import User

router = APIRouter()

@router.post("/", response_model=SuccessResponse[VerseTokenTranslationOut])
def create_translation(
    translation: VerseTokenTranslationCreate,
    db: Session = Depends(get_db)
):
    db_translation = crud.create_translation(db, translation)
    return {
        "message": "Verse token translation created successfully",
        "data": db_translation
    }

@router.get("/{verse_token_id}", response_model=SuccessResponse)
def get_translation(
    verse_token_id: UUID,
    db: Session = Depends(get_db)
):
    db_translation = crud.get_translation(db, verse_token_id)
    if not db_translation:
        raise HTTPException(status_code=404, detail="Translation not found")
    return {
        "message": "Verse token translation fetched successfully",
        "data": [db_translation]
    }


@router.get("/by-project/{project_id}", response_model=SuccessResponse)
def get_by_project(
    project_id: UUID,
    db: Session = Depends(get_db)
):
    translations = crud.get_by_project(db, project_id)
    return {
        "message": "Translations for project fetched successfully",
        "data": translations
    }


@router.put("/{verse_token_id}", response_model=SuccessResponse)
def update_translation(
    verse_token_id: UUID,
    translation: VerseTokenTranslationUpdate,
    db: Session = Depends(get_db)
):
    db_translation = crud.update_translation(db, verse_token_id, translation)
    if not db_translation:
        raise HTTPException(status_code=404, detail="Translation not found")
    return {
        "message": "Verse token translation updated successfully",
        "data": db_translation
    }

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from uuid import UUID
from app.database import get_db
from app.schemas.languages import LanguageCreate, LanguageUpdate, SuccessResponse, ErrorResponse, LanguageResponse
from app.crud.languages import language_service

router = APIRouter()

@router.post("/", response_model=SuccessResponse, status_code=status.HTTP_201_CREATED)
def create_language(language: LanguageCreate, db: Session = Depends(get_db)):
    new_lang = language_service.create_language(db, language)
    return {"message": "Language created successfully", "data": new_lang}

@router.get("/code/{code}", response_model=SuccessResponse)
def get_language_by_code(code: str, db: Session = Depends(get_db)):
    lang = language_service.get_by_code(db, code)
    return {"message": "Language retrieved", "data": lang}

@router.get("/name/{name}", response_model=SuccessResponse)
def get_language_by_name(name: str, db: Session = Depends(get_db)):
    lang = language_service.get_by_name(db, name)
    return {"message": "Language retrieved", "data": lang}

@router.get("/", response_model=list[LanguageResponse])
def get_all_languages(db: Session = Depends(get_db)):
    return language_service.get_all_languages(db)

@router.put("/{language_id}", response_model=SuccessResponse)
def update_language(language_id: UUID, lang_update: LanguageUpdate, db: Session = Depends(get_db)):
    updated_lang = language_service.update_language(db, language_id, lang_update)
    return {"message": "Language updated", "data": updated_lang}

@router.delete("/{language_id}", response_model=SuccessResponse)
def delete_language(language_id: UUID, db: Session = Depends(get_db)):
    deleted_lang = language_service.delete_language(db, language_id)
    return {"message": "Language deleted", "data": deleted_lang}

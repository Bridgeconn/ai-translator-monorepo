from sqlalchemy.orm import Session
from uuid import UUID
from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from app.models.languages import Language
from app.schemas.languages import LanguageCreate, LanguageUpdate

class LanguageService:

    def create_language(self, db: Session, language: LanguageCreate) -> Language:
        existing = db.query(Language).filter(Language.code == language.code).first()
        if existing:
            raise HTTPException(status_code=409, detail="Language code already exists")

        new_language = Language(name=language.name, code=language.code)
        try:
            db.add(new_language)
            db.commit()
            db.refresh(new_language)
            return new_language
        except IntegrityError:
            db.rollback()
            raise HTTPException(status_code=500, detail="Failed to create language")

    def get_by_code(self, db: Session, code: str) -> Language:
        language = db.query(Language).filter(Language.code == code).first()
        if not language:
            raise HTTPException(status_code=404, detail="Language not found")
        return language

    def get_by_name(self, db: Session, name: str) -> Language:
        language = db.query(Language).filter(Language.name == name).first()
        if not language:
            raise HTTPException(status_code=404, detail="Language not found")
        return language

    def get_all_languages(self, db: Session):
        return db.query(Language).all()

    def update_language(self, db: Session, language_id: UUID, update_data: LanguageUpdate):
        language = db.query(Language).filter(Language.id == language_id).first()
        if not language:
            raise HTTPException(status_code=404, detail="Language not found")

        for key, value in update_data.dict(exclude_unset=True).items():
            setattr(language, key, value)
        
        db.commit()
        db.refresh(language)
        return language

    def delete_language(self, db: Session, language_id: UUID):
        language = db.query(Language).filter(Language.id == language_id).first()
        if not language:
            raise HTTPException(status_code=404, detail="Language not found")
        db.delete(language)
        db.commit()
        return language

language_service = LanguageService()

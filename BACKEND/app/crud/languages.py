from sqlalchemy.orm import Session
from uuid import UUID
from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
from app.models.languages import Language
from app.schemas.languages import LanguageCreate, LanguageUpdate
from typing import Union

class LanguageService:

    def create_language(self, db: Session, language: LanguageCreate) -> Language:
        existing = db.query(Language).filter(Language.BCP_code == language.BCP_code).first()
        if existing:
            raise HTTPException(status_code=409, detail="Language with this BCP code already exists")

        new_language = Language(
            name=language.name,
            BCP_code=language.BCP_code,
            ISO_code=language.ISO_code
        )
        try:
            db.add(new_language)
            db.commit()
            db.refresh(new_language)
            return new_language
        except IntegrityError:
            db.rollback()
            raise HTTPException(status_code=500, detail="Failed to create language")

    def get_by_id(self, db: Session, language_id: UUID) -> Language:
        language = db.query(Language).filter(Language.language_id == language_id).first()
        if not language:
            raise HTTPException(status_code=404, detail="Language with ID not found")
        return language

    def get_by_code(self, db: Session, code: str) -> Language:
        language = db.query(Language).filter(Language.BCP_code == code).first()
        if not language:
            raise HTTPException(status_code=404, detail="Language with BCP code not found")
        return language

    def get_by_iso(self, db: Session, iso_code: str) -> Language:
        language = db.query(Language).filter(Language.ISO_code == iso_code).first()
        if not language:
            raise HTTPException(status_code=404, detail="Language with ISO code not found")
        return language

    def get_by_name(self, db: Session, name: str) -> Language:
        language = db.query(Language).filter(Language.name == name).first()
        if not language:
            raise HTTPException(status_code=404, detail="Language with name not found")
        return language

    def get_by_any(self, db: Session, query: str) -> Language:
        try:
            query_uuid = UUID(query)
            language = db.query(Language).filter(Language.language_id == query_uuid).first()
        except ValueError:
            language = db.query(Language).filter(
                (Language.BCP_code == query) |
                (Language.ISO_code == query) |
                (Language.name == query)
            ).first()

        if not language:
            raise HTTPException(status_code=404, detail="Language not found by any matching field")
        return language

    def get_all_languages(self, db: Session):
        return db.query(Language).all()

    def update_language(self, db: Session, language_id: UUID, update_data: LanguageUpdate):
        language = db.query(Language).filter(Language.language_id == language_id).first()
        if not language:
            raise HTTPException(status_code=404, detail="Language with ID not found")

        for key, value in update_data.dict(exclude_unset=True).items():
            setattr(language, key, value)

        db.commit()
        db.refresh(language)
        return language

    def delete_language(self, db: Session, language_id: UUID):
        language = db.query(Language).filter(Language.language_id == language_id).first()
        if not language:
            raise HTTPException(status_code=404, detail="Language with ID not found")
        db.delete(language)
        db.commit()
        return language

language_service = LanguageService()

def get_all_languages(db: Session):
    return db.query(Language).all()

def get_language_by_code(db: Session, code: str):
    return db.query(Language).filter(Language.code == code).first()

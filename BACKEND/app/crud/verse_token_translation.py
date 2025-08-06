from sqlalchemy.orm import Session
from uuid import UUID
from fastapi import HTTPException
from app.models import verse_token_translation as models
from app.schemas import verse_token_translation as schemas


# POST: Create Translation
def create_translation(db: Session, translation: schemas.VerseTokenTranslationCreate):
    db_translation = models.VerseTokenTranslation(
        project_id=translation.project_id,
        verse_id=translation.verse_id,
        verse_translated_text=translation.verse_translated_text,
        is_reviewed=translation.is_reviewed,
        is_active=translation.is_active
    )
    db.add(db_translation)
    db.commit()
    db.refresh(db_translation)
    return db_translation


# GET: Get a single translation by ID
def get_translation(db: Session, verse_token_id: UUID):
    db_translation = db.query(models.VerseTokenTranslation).filter(
        models.VerseTokenTranslation.verse_token_id == verse_token_id
    ).first()

    if db_translation is None:
        raise HTTPException(status_code=404, detail="Translation not found")

    return db_translation


# PUT: Update an existing translation
def update_translation(db: Session, verse_token_id: UUID, translation: schemas.VerseTokenTranslationUpdate):
    db_translation = db.query(models.VerseTokenTranslation).filter(
        models.VerseTokenTranslation.verse_token_id == verse_token_id
    ).first()

    if not db_translation:
        raise HTTPException(status_code=404, detail="Translation not found")

    for var, value in vars(translation).items():
        if value is not None:
            setattr(db_translation, var, value)

    db.commit()
    db.refresh(db_translation)
    return db_translation


# GET: Get all translations by project ID
def get_by_project(db: Session, project_id: UUID):
    return db.query(models.VerseTokenTranslation).filter(
        models.VerseTokenTranslation.project_id == project_id
    ).all()

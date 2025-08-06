# app/crud/word_token_translation.py
from sqlalchemy.orm import Session
from app.models.word_token_translation import WordTokenTranslation
from app.schemas.word_token_translation import WordTokenCreate, WordTokenUpdate
from uuid import UUID

def create_or_increment_token(db: Session, project_id: UUID, token: str):
    db_token = db.query(WordTokenTranslation).filter_by(project_id=project_id, token_text=token).first()
    if db_token:
        db_token.frequency += 1
    else:
        db_token = WordTokenTranslation(project_id=project_id, token_text=token)
        db.add(db_token)
    db.commit()
    db.refresh(db_token)
    return db_token

def update_translation(db: Session, word_token_id: UUID, update_data: WordTokenUpdate):
    db_token = db.query(WordTokenTranslation).filter_by(word_token_id=word_token_id).first()
    if not db_token:
        return None
    for field, value in update_data.dict(exclude_unset=True).items():
        setattr(db_token, field, value)
    db.commit()
    db.refresh(db_token)
    return db_token

def get_tokens_by_project(db: Session, project_id: UUID):
    return db.query(WordTokenTranslation).filter_by(project_id=project_id).all()

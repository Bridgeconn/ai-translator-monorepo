from sqlalchemy.orm import Session
from app.models.languages import Language

def get_all_languages(db: Session):
    return db.query(Language).all()

def get_language_by_code(db: Session, code: str):
    return db.query(Language).filter(Language.code == code).first()

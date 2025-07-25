from sqlalchemy.orm import Session
from app.models.languages import Language
from app.schemas.languages import LanguageCreate
from sqlalchemy import func



# create a new language
def create_language(db: Session, language_data: LanguageCreate):
    # language = Language(**language_data.dict())
    language = Language(**language_data.model_dump())
    db.add(language)
    db.commit()
    db.refresh(language)
    return language

# get language by code
def get_language_by_code(db: Session, code: str):
    return db.query(Language).filter(Language.code == code).first()

# get languages by name
# def get_language_by_name(db: Session, name: str):
#     return db.query(Language).filter(Language.name == name).first()
def get_language_by_name(db: Session, name: str):
    return db.query(Language).filter(func.lower(Language.name) == name.lower()).first()

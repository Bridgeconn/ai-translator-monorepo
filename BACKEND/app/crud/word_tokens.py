# app/crud/word_tokens.py

from sqlalchemy.orm import Session
from app.models.word_token_translation import WordTokenTranslation
from app.models.verse import Verse
from app.utils.tokenizer import tokenize_text
from uuid import UUID
from sqlalchemy.exc import IntegrityError
from typing import Set

def extract_and_store_word_tokens(db: Session, project_id: UUID):
    verses = db.query(Verse).all()  # optionally filter by project_id
    unique_tokens: Set[str] = set()

    for verse in verses:
        words = tokenize_text(verse.content)
        unique_tokens.update(words)

    for word in unique_tokens:
        word_token = WordTokenTranslation(
            project_id=project_id,
            token_text=word,
            frequency=1,  # or calculate later
            is_reviewed=False,
            is_active=True
        )
        try:
            db.add(word_token)
            db.commit()
        except IntegrityError:
            db.rollback()  # token already exists

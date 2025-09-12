from collections import Counter
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from uuid import UUID
from typing import Optional
from datetime import datetime, timezone
from app.models.word_token_translation import WordTokenTranslation
from app.models.verse import Verse
from app.models.project import Project
from app.utils.tokenizer import tokenize_text
from app.models.chapter import Chapter
from app.models.book import Book

def extract_and_store_word_tokens(db: Session, project_id: UUID, book_id: UUID):
    # Get the source_id associated with the project
    project_id = db.query(Project.project_id).filter_by(project_id=project_id).scalar()
    if not project_id:
        raise ValueError("Invalid project_id or project does not exist.")
    # Fetch the book by its ID
    book = db.query(Book).filter_by(book_id=book_id).first()
    if not book:
        raise ValueError("Invalid book_id or book does not exist.")
    
    source_id = db.query(Project.source_id).filter(Project.project_id == project_id).scalar()
    if not source_id:
        raise ValueError("Invalid source_id or project does not have a source.")
    # Check if this book already has tokens for this project to prevent duplicates
    check_bkn_tw = db.query(WordTokenTranslation).filter_by(project_id=project_id, book_id=book_id).first()
    if check_bkn_tw:
        raise ValueError("Book tokens already exist for this project.")
    verses = (
        db.query(Verse)
        .join(Chapter)
        .filter(Chapter.book_id == book_id)
        .all()
    )
    token_counter = Counter()


    for verse in verses:
        words = tokenize_text(verse.content)
        token_counter.update(words)

    for word, freq in token_counter.items():
        existing_token = (
            db.query(WordTokenTranslation)
            .filter_by(project_id=project_id, token_text=word, book_id=book_id)
            .first()
        )

        if existing_token:
            existing_token.frequency += freq
            existing_token.updated_at = datetime.now(timezone.utc)
        else:
            token = WordTokenTranslation(
                project_id=project_id,
                book_id=book_id,
                token_text=word,
                frequency=freq,
                is_reviewed=False,
                is_active=True,
                created_at=datetime.now(timezone.utc),
                updated_at=datetime.now(timezone.utc),
            )
            db.add(token)

    db.commit()
def get_token_by_project_and_text(db: Session, project_id: UUID, token_text: str):
    return db.query(WordTokenTranslation).filter(
        WordTokenTranslation.project_id == project_id,
        WordTokenTranslation.token_text == token_text
    ).all()
def get_tokens_all(db: Session, project_id: UUID, book_id: Optional[UUID] = None):
    if book_id:
        return db.query(WordTokenTranslation).filter_by(project_id=project_id, book_id=book_id).all()
    return db.query(WordTokenTranslation).filter_by(project_id=project_id).all()

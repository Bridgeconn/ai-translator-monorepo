from collections import Counter
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from uuid import UUID
from datetime import datetime

from app.models.word_token_translation import WordTokenTranslation
from app.models.verse import Verse
from app.models.project import Project
from app.utils.tokenizer import tokenize_text
from app.models.chapter import Chapter
from app.models.book import Book

def extract_and_store_word_tokens(db: Session, project_id: UUID):
    # Get the source_id associated with the project
    source_id = db.query(Project.source_id).filter(Project.project_id == project_id).scalar()
    if not source_id:
        raise ValueError("Invalid project_id or project does not have a source_id.")

    # Fetch all verses from books related to the project's source_id
    verses = (
    db.query(Verse)
    .join(Chapter, Chapter.chapter_id == Verse.chapter_id)
    .join(Book, Book.book_id == Chapter.book_id)
    .filter(Book.source_id == source_id)
    .all()
)

    token_counter = Counter()

    for verse in verses:
        words = tokenize_text(verse.content)
        token_counter.update(words)

    for word, freq in token_counter.items():
        existing_token = (
            db.query(WordTokenTranslation)
            .filter_by(project_id=project_id, token_text=word)
            .first()
        )

        if existing_token:
            existing_token.frequency += freq
            existing_token.updated_at = datetime.utcnow()
        else:
            token = WordTokenTranslation(
                project_id=project_id,
                token_text=word,
                frequency=freq,
                is_reviewed=False,
                is_active=True,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )
            db.add(token)

    db.commit()
def get_token_by_project_and_text(db: Session, project_id: UUID, token_text: str):
    return db.query(WordTokenTranslation).filter(
        WordTokenTranslation.project_id == project_id,
        WordTokenTranslation.token_text == token_text
    ).first()

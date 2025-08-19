from uuid import uuid4
from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.models import verse_tokens
from app.models.project import Project
from app.models.verse import Verse
from app.models.chapter import Chapter
from app.models.book import Book
from app.models.verse_tokens import VerseTokenTranslation
from uuid import UUID
from sqlalchemy.orm import joinedload
from typing import Optional


def create_verse_tokens_for_project(db: Session, project_id, book_name):
    project = db.query(Project).filter(Project.project_id == project_id).first()
    if not project:
        raise ValueError("Project not found")
    source_id = project.source_id
    check_source_id = db.query(Project.source_id).filter(Project.project_id == project_id).scalar()
    if not check_source_id:
        raise ValueError("Invalid source_id or project does not have a source.")
    book_name = db.query(Book.book_name).filter(Book.source_id == source_id, Book.book_name == book_name).scalar()
    if not book_name:
        raise ValueError("Invalid book_name or book does not exist.")
    books = db.query(Book).filter(Book.source_id == source_id).all()
    print(f"{len(books)} books found for source_id: {source_id}")

    verses = (
    db.query(Verse)
    .join(Chapter, Chapter.chapter_id == Verse.chapter_id)
    .join(Book, Book.book_id == Chapter.book_id)
    .filter(Book.book_name == book_name)
    .all()
)   
    check_bkn_tv = db.query(VerseTokenTranslation).filter_by(project_id=project_id, book_name=book_name).first()
    if check_bkn_tv:
        raise ValueError("Book name already exists for this project.")
    created_tokens = []
    for verse in verses:
        token = VerseTokenTranslation(
            verse_token_id=uuid4(),
            project_id=project.project_id,
            verse_id=verse.verse_id,
            book_name=book_name,
            token_text=verse.content,
            verse_translated_text=None,
            is_reviewed=False,
            is_active=True
        )
        db.add(token)
        created_tokens.append(token)

    db.commit()
    return created_tokens

def get_verse_tokens_by_project(db: Session, project_id: UUID, book_name: Optional[str] = None):
    projects = db.query(VerseTokenTranslation).filter(
        VerseTokenTranslation.project_id ==project_id
    )
    if not projects:
        raise HTTPException(status_code=404, detail="No project found.")

    if book_name:
        return db.query(VerseTokenTranslation).filter_by(project_id=project_id, book_name=book_name).all()
    return db.query(VerseTokenTranslation).filter_by(project_id=project_id).all()

def get_verse_token_by_verse_id(db: Session, verse_token_id: UUID):
    token = db.query(VerseTokenTranslation).filter(
        VerseTokenTranslation.verse_token_id == verse_token_id
    ).first()

    if not token:
        raise HTTPException(status_code=404, detail="Verse token not found.")

    return token


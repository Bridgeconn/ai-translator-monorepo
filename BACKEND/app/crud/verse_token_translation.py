from uuid import uuid4
from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.models import verse_token_translation
from app.models.project import Project
from app.models.verse import Verse
from app.models.chapter import Chapter
from app.models.book import Book
from app.models.verse_token_translation import VerseTokenTranslation
from uuid import UUID
from sqlalchemy.orm import joinedload

def create_verse_tokens_for_project(db: Session, project_id):
    project = db.query(Project).filter(Project.project_id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    print("Project found:", project.name)

    source_id = project.source_id
    books = db.query(Book).filter(Book.source_id == source_id).all()
    print(f"{len(books)} books found for source_id: {source_id}")

    created_tokens = []

    for book in books:
        print(f" Book: {book.book_name} (ID: {book.book_id})")

        # Load chapters
        chapters = db.query(Chapter).filter(Chapter.book_id == book.book_id).all()
        print(f"  🔹 {len(chapters)} chapters found in book")

        for chapter in chapters:
            print(f"Chapter {chapter.chapter_number} (ID: {chapter.chapter_id})")

            # Load verses
            verses = db.query(Verse).filter(Verse.chapter_id == chapter.chapter_id).all()
            print(f"{len(verses)} verses found in chapter")

            for verse in verses:
                token = VerseTokenTranslation(
                    verse_token_id=uuid4(),
                    project_id=project.project_id,
                    verse_id=verse.verse_id,
                    token_text=verse.content,
                    verse_translated_text=None,
                    is_reviewed=False,
                    is_active=True
                )
                db.add(token)
                created_tokens.append(token)

    db.commit()
    print(f"{len(created_tokens)} verse tokens created.")
    return created_tokens

    def get_verse_tokens_by_project(db: Session, project_id):
        tokens = db.query(VerseTokenTranslation).filter(
        VerseTokenTranslation.project_id == project_id
    ).all()

    if not tokens:
        raise HTTPException(status_code=404, detail="No tokens found for this project.")

    result = [
        {
            "verse_id": token.verse_id,
            "token_text": token.token_text
        }
        for token in tokens
    ]

    return result

def get_verse_token_by_id(db: Session, verse_token_id: UUID):
    token = db.query(VerseTokenTranslation).filter(
        VerseTokenTranslation.verse_token_id == verse_token_id
    ).first()

    if not token:
        raise HTTPException(status_code=404, detail="Verse token not found.")

    return {
        "verse_token_id": token.verse_token_id,
        "token_text": token.token_text
    }


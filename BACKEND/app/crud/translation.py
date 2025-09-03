import re
from datetime import datetime
from fastapi import HTTPException
from sqlalchemy.orm import Session
from app.models.translation_draft import TranslationDraft
from app.models.word_token_translation import WordTokenTranslation
from app.models.book import Book
from app.models.project import Project
from uuid import UUID

class TranslationService:
    def generate_draft(self, db: Session, project_id):
        # 1. Validate project
        project = db.query(Project).filter(Project.project_id == project_id).first()
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")

        # 2. Check if a draft already exists for the project (latest draft)
        existing_draft = (
            db.query(TranslationDraft)
            .filter(TranslationDraft.project_id == project_id)
            .order_by(TranslationDraft.created_at.desc())
            .first()
        )
        if existing_draft:
            return existing_draft

        # 3. Fetch books under that source
        books = db.query(Book).filter(Book.source_id == project.source_id).all()
        if not books:
            raise HTTPException(status_code=404, detail="No books found for this project")

        # 4. Fetch active tokens with translations
        tokens = db.query(WordTokenTranslation).filter(
            WordTokenTranslation.project_id == project_id,
            WordTokenTranslation.translated_text.isnot(None),
            WordTokenTranslation.is_active == True
        ).all()
        if not tokens:
            raise HTTPException(status_code=404, detail="No translated words found")

        translation_dict = {t.token_text: t.translated_text for t in tokens}

        # 5. Tokenization regex
        token_pattern = re.compile(r'(\\\w+)|([^\W\d_]+)|([\W\d_])')

        translated_blocks = []
        for book in books:
            content = book.usfm_content or ""
            tokens_found = token_pattern.findall(content)
            result = []
            for tag, word, punct in tokens_found:
                if tag:
                    result.append(tag)
                elif word:
                    result.append(translation_dict.get(word, word))
                else:
                    result.append(punct)
            translated_blocks.append(''.join(result))

        final_content = "\n\n".join(translated_blocks).strip()

        draft = TranslationDraft(
            project_id=project_id,
            draft_name=f"{project.name}_draft_{datetime.utcnow().isoformat()}",
            content=final_content,
            format="usfm",
            file_size=len(final_content.encode("utf-8")),
            download_count=0,
        )
        db.add(draft)
        db.commit()
        db.refresh(draft)
        return draft


    def generate_draft_for_book(self, db: Session, project_id, book_name: str):
        # 1. Validate project
        project = db.query(Project).filter(Project.project_id == project_id).first()
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")

        # 2. Check if a draft already exists for this book
        existing_draft = (
            db.query(TranslationDraft)
            .filter(
                TranslationDraft.project_id == project_id,
                TranslationDraft.draft_name.ilike(f"%{book_name}%")
            )
            .order_by(TranslationDraft.created_at.desc())
            .first()
        )
        if existing_draft:
            return existing_draft

        # 3. Fetch book by name
        book = db.query(Book).filter(
            Book.source_id == project.source_id,
            Book.book_name == book_name
        ).first()
        if not book:
            raise HTTPException(status_code=404, detail=f"Book '{book_name}' not found in project")

        # 4. Fetch active tokens with translations
        tokens = db.query(WordTokenTranslation).filter(
            WordTokenTranslation.project_id == project_id,
            WordTokenTranslation.translated_text.isnot(None),
            WordTokenTranslation.is_active == True
        ).all()
        if not tokens:
            raise HTTPException(status_code=404, detail="No translated words found")

        translation_dict = {t.token_text.lower(): t.translated_text for t in tokens}

        # 5. Tokenization regex
        token_pattern = re.compile(r'(\\\w+)|([^\W\d_]+)|([\W\d_])')

        content = book.usfm_content or ""
        tokens_found = token_pattern.findall(content)
        result = []
        for tag, word, punct in tokens_found:
            if tag:
                result.append(tag)
            elif word:
                translated_word = translation_dict.get(word.lower(), word)
                result.append(translated_word)
            else:
                result.append(punct)

        final_content = ''.join(result).strip()

        # 6. Save draft in DB
        draft = TranslationDraft(
            project_id=project_id,
            draft_name=f"{project.name}_{book_name}_draft_{datetime.utcnow().isoformat()}",
            content=final_content,
            format="usfm",
            file_size=len(final_content.encode("utf-8")),
            download_count=0,
        )
        db.add(draft)
        db.commit()
        db.refresh(draft)
        return draft


translation_service = TranslationService()


def get_latest_draft(db: Session, project_id: UUID, book_name: str) -> TranslationDraft:
    """
    Fetch the latest draft for a given project and book
    """
    draft = (
        db.query(TranslationDraft)
        .filter(
            TranslationDraft.project_id == project_id,
            TranslationDraft.draft_name.ilike(f"%{book_name}%")
        )
        .order_by(TranslationDraft.created_at.desc())
        .first()
    )
    if not draft:
        raise HTTPException(status_code=404, detail="No draft found for this book")
    return draft
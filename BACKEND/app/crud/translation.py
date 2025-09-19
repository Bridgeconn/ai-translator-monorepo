import re
from datetime import datetime, timezone
from fastapi import HTTPException
from sqlalchemy.orm import Session
from app.models.word_draft import WordDraft
from app.models.word_token_translation import WordTokenTranslation
from app.models.book import Book
from app.models.project import Project
from uuid import UUID, uuid4

class TranslationService:
    def generate_draft(self, db: Session, project_id):
        if isinstance(project_id, str):
            project_id = UUID(project_id)

        # 1. Validate project
        project = db.query(Project).filter(Project.project_id == project_id).first()
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")

        # 2. Check if a draft already exists for the project (latest draft)
        existing_draft = (
            db.query(WordDraft)
            .filter(WordDraft.project_id == project_id)
            .order_by(WordDraft.created_at.desc())
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

        draft = WordDraft(
            project_id=project_id,
            draft_name=f"{project.name}_draft_{datetime.now(timezone.utc).isoformat()}",
            content=final_content,
            format="usfm",
            file_size=len(final_content.encode("utf-8")),
            download_count=0,
        )
        db.add(draft)
        db.commit()
        db.refresh(draft)
        return draft
    def generate_draft_for_book(self, db: Session, project_id, book_id: UUID):
     if isinstance(project_id, str):
        project_id = UUID(project_id)

    # Validate project
     project = db.query(Project).filter(Project.project_id == project_id).first()
     if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Fetch book
     book = db.query(Book).filter(
        Book.source_id == project.source_id,
        Book.book_id == book_id
     ).first()
     if not book:
        raise HTTPException(status_code=404, detail=f"Book '{book_id}' not found in project")

    # Fetch translations
     tokens = db.query(WordTokenTranslation).filter(
        WordTokenTranslation.project_id == project_id,
        WordTokenTranslation.book_id == book_id,       # 🔥 add this
        WordTokenTranslation.translated_text.isnot(None),
    ).all()
     if not tokens:
        raise HTTPException(status_code=404, detail="No translated words found")

     token_dict = {t.token_text.lower(): t.translated_text for t in tokens}

    # Rebuild content
     token_pattern = re.compile(r'(\\\w+)|([^\W\d_]+)|([\W\d_])')
     tokens_found = token_pattern.findall(book.usfm_content or "")
     rebuilt = []
     for tag, word, punct in tokens_found:
        if tag:
            rebuilt.append(tag)
        elif word:
            rebuilt.append(token_dict.get(word.lower(), word))
        else:
            rebuilt.append(punct)
     final_content = ''.join(rebuilt).strip()

    # 🔄 Always refresh if draft exists
     existing_draft = (
        db.query(WordDraft)
        .filter(WordDraft.project_id == project_id, WordDraft.book_id == book_id)
        .order_by(WordDraft.created_at.desc())
        .first()
    )
     if existing_draft:
        existing_draft.content = final_content
        existing_draft.file_size = len(final_content.encode("utf-8"))
        existing_draft.updated_at = datetime.now(timezone.utc)

        db.add(existing_draft)
        db.commit()
        db.refresh(existing_draft)
        return existing_draft

    # Otherwise create new draft
     draft = WordDraft(
        draft_id=uuid4(),
        project_id=project_id,
        book_id=book_id,
        draft_name=f"{project.name}_{book.book_name}_draft_{datetime.now(timezone.utc).isoformat()}",
        content=final_content,
        format="usfm",
        file_size=len(final_content.encode("utf-8")),
        download_count=0,
    )
     db.add(draft)
     db.commit()
     db.refresh(draft)
     return draft

    def get_latest_draft(self, db: Session, project_id: UUID, book_id: UUID) -> WordDraft:
        """
        Fetches the single latest draft for a specific project and book.
        This will return the most recent version, whether it's a generated USFM draft
        or a manually saved free-form draft.
        """
        latest_draft = (
            db.query(WordDraft)
            .filter(
                WordDraft.project_id == project_id,
                WordDraft.book_id == book_id,  # ✅ Filter directly on book_id for accuracy
            )
            .order_by(WordDraft.created_at.desc())  # ✅ Order by creation date to get the latest
            .first()
        )
        if not latest_draft:
            raise HTTPException(status_code=404, detail="No draft found for this book")
        return latest_draft
    
    def save_tokens_for_book(self, db: Session, project_id: UUID, book_id: UUID, updated_tokens: list):
     if isinstance(project_id, str):
        project_id = UUID(project_id)

     updated_tokens_response = []

    # 1️⃣ Save tokens only
     for t in updated_tokens:
        token_id_str = t.get("word_token_id")
        translated_text = t.get("translated_text")
        if not token_id_str or translated_text is None:
            continue

        try:
            token_id = UUID(str(token_id_str))
        except ValueError:
            continue

        token = db.query(WordTokenTranslation).filter(
            WordTokenTranslation.word_token_id == token_id,
            WordTokenTranslation.project_id == project_id
        ).first()

        if token:
            token.translated_text = translated_text
            db.add(token)
            updated_tokens_response.append({
                "token_id": str(token.word_token_id),
                "translated_text": token.translated_text
            })

     db.commit()
     return {"updated_tokens": updated_tokens_response}

    def upsert_manual_draft(self, db: Session, project_id: UUID, book_id: UUID, content: str):
        #  Fetch latest draft for this project+book
        draft = (
            db.query(WordDraft)
            .filter(WordDraft.project_id == project_id, WordDraft.book_id == book_id)
            .order_by(WordDraft.created_at.desc())
            .first()
        )

        if not draft:
            raise HTTPException(
                status_code=404,
                detail="No draft exists for this book. Please generate one first!"
            )

        #  Update fields
        draft.content = content
        draft.file_size = len(content.encode("utf-8")) if content else 0
        draft.updated_at = datetime.now(timezone.utc)

        db.add(draft)
        db.commit()
        db.refresh(draft)

        return draft
translation_service = TranslationService()

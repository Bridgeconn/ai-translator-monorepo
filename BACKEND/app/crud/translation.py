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

    def generate_draft_for_book(self, db: Session, project_id, book_id):
        # Accept str UUIDs too
        if isinstance(project_id, str):
            project_id = UUID(project_id)
        if isinstance(book_id, str):
            book_id = UUID(book_id)

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

        # Fetch translations (only tokens that have a translated_text)
        tokens = db.query(WordTokenTranslation).filter(
            WordTokenTranslation.project_id == project_id,
            WordTokenTranslation.book_id == book_id,
            WordTokenTranslation.translated_text.isnot(None),
        ).all()
        if not tokens:
            raise HTTPException(status_code=404, detail="No translated words found")

        # Build token lookup dict (lowercased keys trimmed)
        token_dict = {}
        for t in tokens:
            if not t.token_text:
                continue
            key = t.token_text.strip().lower()
            if key:
                token_dict[key] = t.translated_text or ""

        if not token_dict:
            raise HTTPException(status_code=404, detail="No valid translated tokens found")

        # Sort tokens by length (longer first) so longer/multiword tokens match before shorter substrings
        tokens_sorted = sorted(token_dict.keys(), key=len, reverse=True)

        source_content = book.usfm_content or ""
        lower_source = source_content.lower()

        result_chars = []
        i = 0
        n = len(source_content)

        # helper to check Unicode letter boundary
        def _is_letter(ch):
            # None or non-letter => False; letter => True
            return ch.isalpha() if ch is not None else False

        while i < n:
            matched = False
            # try tokens in order (longer first)
            for tok in tokens_sorted:
                tlen = len(tok)
                # quick length check and substring compare on lowercased text
                if i + tlen <= n and lower_source.startswith(tok, i):
                    # boundary checks: previous and next char cannot be letters (to avoid substring matches)
                    prev_char = source_content[i - 1] if i - 1 >= 0 else None
                    next_char = source_content[i + tlen] if i + tlen < n else None
                    prev_is_letter = _is_letter(prev_char)
                    next_is_letter = _is_letter(next_char)

                    # If token is adjacent to letters on either side, skip (not a whole token)
                    if prev_is_letter or next_is_letter:
                        # not a whole-word match
                        continue

                    # it's a valid token match — perform replacement
                    original_slice = source_content[i:i + tlen]
                    translated = token_dict[tok]

                    # Preserve basic capitalization for Latin script tokens
                    # For non-Latin scripts (e.g., Devanagari), this is a no-op
                    if original_slice.isupper():
                        translated_out = translated.upper()
                    elif original_slice[:1].isupper():
                        # Title case first char -> capitalize translated's first char (naive)
                        translated_out = translated[:1].upper() + translated[1:] if translated else translated
                    else:
                        translated_out = translated

                    result_chars.append(translated_out)
                    i += tlen
                    matched = True
                    break

            if not matched:
                # no token matched here: copy one original character
                result_chars.append(source_content[i])
                i += 1

        final_content = ''.join(result_chars)

        # Always refresh if draft exists
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

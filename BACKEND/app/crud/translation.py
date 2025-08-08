
import re
from datetime import datetime
from fastapi import HTTPException
from sqlalchemy.orm import Session
from app.models.translationdraft import TranslationDraft
from app.models.wordtokentranslation import WordTokenTranslation
from app.models.books import Book
from app.models.project import Project

class TranslationService:
    def generate_draft(self, db: Session, project_id):
        # 1. Validate project
        project = db.query(Project).filter(Project.project_id == project_id).first()
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")

        # 2. Fetch books under that source
        books = db.query(Book).filter(Book.source_id == project.source_id).all()
        if not books:
            raise HTTPException(status_code=404, detail="No books found for this project")

        # 3. Fetch active tokens with translations
        tokens = db.query(WordTokenTranslation).filter(
            WordTokenTranslation.project_id == project_id,
            WordTokenTranslation.translated_text.isnot(None),
            WordTokenTranslation.is_active == True
        ).all()
        if not tokens:
            raise HTTPException(status_code=404, detail="No translated words found")

        translation_dict = {t.token_text: t.translated_text for t in tokens}

        # 4. Tokenization regex
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

translation_service = TranslationService()

from sqlalchemy.orm import Session
from uuid import UUID
from fastapi import HTTPException
from app.models.word_token_translation import WordTokenTranslation
from app.models.project import Project
from app.models.languages import Language
from app.schemas.word_token_translation import  WordTokenUpdate
from app.utils.vachan_ai import translate_texts_with_polling


def update_translation(db: Session, word_token_id: UUID, update_data: WordTokenUpdate):
    db_token = db.query(WordTokenTranslation).filter_by(word_token_id=word_token_id).first()
    if not db_token:
        return None
    for field, value in update_data.dict(exclude_unset=True).items():
        setattr(db_token, field, value)
    db.commit()
    db.refresh(db_token)
    return db_token
def generate_tokens_batch(db: Session, project_id: UUID, book_name: str):
    # Fetch the project first
    project = db.query(Project).filter(Project.project_id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Fetch source language
    source_lang_obj = None
    if project.source and project.source.language_id:
        source_lang_obj = db.query(Language).filter(Language.language_id == project.source.language_id).first()

    # Fetch target language
    target_lang_obj = None
    if project.target_language_id:
        target_lang_obj = db.query(Language).filter(Language.language_id == project.target_language_id).first()

    source_lang_code = source_lang_obj.BCP_code if source_lang_obj else None
    target_lang_code = target_lang_obj.BCP_code if target_lang_obj else None

    if not source_lang_code or not target_lang_code:
        raise HTTPException(status_code=400, detail="Source or target language not found")
    print(f"project_id type: {type(project_id)}, value: {project_id}")
    print(f"book_name type: {type(book_name)}, value: '{book_name}'")
    tokens = db.query(WordTokenTranslation).filter(
    WordTokenTranslation.project_id == project_id,
    WordTokenTranslation.book_name == book_name

     ).all()

    print("Tokens found:", len(tokens))
    if not tokens:
        raise HTTPException(status_code=404, detail="No tokens found for this project/book")

    total_tokens = len(tokens)
    if total_tokens > 300:
        batch_size = 50
    elif total_tokens > 100:
        batch_size = 30
    elif total_tokens > 50:
        batch_size = 20
    else:
        batch_size = 10

    translated_tokens = []

    # Process in batches
    for i in range(0, total_tokens, batch_size):
        batch = tokens[i:i+batch_size]
        texts = [t.token_text for t in batch]

        try:
            translated_texts = translate_texts_with_polling(
                src_lang=source_lang_code,
                tgt_lang=target_lang_code,
                texts=texts
            )

            # Map translations back to tokens
            for token, tr_text in zip(batch, translated_texts):
                token.translated_text = tr_text
                translated_tokens.append(token)

            db.commit()

        except Exception as e:
            print(f"Batch {i//batch_size+1} failed: {e}")
    return translated_tokens

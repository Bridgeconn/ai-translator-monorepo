# app/crud/word_token_translation.py
from sqlalchemy.orm import Session
from app.models.word_token_translation import WordTokenTranslation
from app.schemas.word_token_translation import WordTokenUpdate
from uuid import UUID
from fastapi import HTTPException
from app.schemas.word_token_translation import WordTokenTranslationRequest, WordTokenTranslationResponse
from app.utils.vachan_ai import translate_text_with_polling
from app.models.project import Project
from app.models.languages import Language

def get_tokens_by_project(db: Session, project_id: UUID):
    return db.query(WordTokenTranslation).filter_by(project_id=project_id).all()

def update_translation(db: Session, word_token_id: UUID, update_data: WordTokenUpdate):
    db_token = db.query(WordTokenTranslation).filter_by(word_token_id=word_token_id).first()
    if not db_token:
        return None
    for field, value in update_data.dict(exclude_unset=True).items():
        setattr(db_token, field, value)
    db.commit()
    db.refresh(db_token)
    return db_token

def translate_and_store_word_token(db: Session, data: WordTokenTranslationRequest):
    # Fetch token with its project and project's source and target_language
    token_obj = db.query(WordTokenTranslation).filter(
        WordTokenTranslation.word_token_id == data.word_token_id
    ).first()
    if not token_obj:
        raise HTTPException(status_code=404, detail="Word token not found")

    project = db.query(Project).filter(Project.project_id == token_obj.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Get source language via project's source -> source.language_id -> Language
    source_lang_obj = None
    if project.source and project.source.language_id:
        source_lang_obj = db.query(Language).filter(Language.language_id == project.source.language_id).first()

    # Get target language via project's target_language relationship
    target_lang_obj = None
    if project.target_language_id:
        target_lang_obj = db.query(Language).filter(Language.language_id == project.target_language_id).first()

    source_lang_code = source_lang_obj.BCP_code if source_lang_obj else None
    target_lang_code = target_lang_obj.BCP_code if target_lang_obj else None

    if not source_lang_code or not target_lang_code:
        raise HTTPException(status_code=400, detail="Source or target language not found")

    # Call translation API with actual language codes
    translated_text = translate_text_with_polling(
        src_lang=source_lang_code,
        tgt_lang=target_lang_code,
        text=token_obj.token_text
    )

    # Update token translation
    token_obj.translated_text = translated_text
    db.commit()
    db.refresh(token_obj)

    return WordTokenTranslationResponse(
        word_token_id=token_obj.word_token_id,
        translated_text=token_obj.translated_text,
        source_language=source_lang_code,
        target_language=target_lang_code,
    )

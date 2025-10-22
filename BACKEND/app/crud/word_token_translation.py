import json
from typing import Generator
from sqlalchemy.orm import Session
from uuid import UUID
from fastapi import HTTPException
from app.models.word_token_translation import WordTokenTranslation
from app.models.project import Project
from app.models.languages import Language
from app.schemas.word_token_translation import  WordTokenUpdate
from app.utils.vachan_ai import get_access_token, poll_job_status, request_translation, translate_texts_with_polling
from app.models.book import Book # ✅ Add import for the Book model
def update_translation(db: Session, word_token_id: UUID, update_data: WordTokenUpdate):
    db_token = db.query(WordTokenTranslation).filter_by(word_token_id=word_token_id).first()
    if not db_token:
        return None
    for field, value in update_data.dict(exclude_unset=True).items():
        setattr(db_token, field, value)
    db.commit()
    db.refresh(db_token)
    return db_token

def generate_tokens_batch(db: Session, project_id: UUID, book_id: UUID,model_name: str = "nllb-600M"):
    # Fetch the project first
    project = db.query(Project).filter(Project.project_id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    # ✅ Add this to get the book object
    book = db.query(Book).filter(Book.book_id == book_id).first()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
      
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
    print(f"book_id type: {type(book_id)}, value: '{book_id}'")

    print(">>> HIT generate_batch route")
    print("project_id:", project_id)
    print("book_id:", book_id)
    print("Looking for book_id =", repr(book_id))
    # Fetch tokens for this project and book
    tokens = db.query(WordTokenTranslation).filter_by(project_id=project_id, book_id=book_id).all()
    print(">>> After query")
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
                texts=texts,
                model_name=model_name
            )

            # Map translations back to tokens
            for token, tr_text in zip(batch, translated_texts):
                token.translated_text = tr_text
                translated_tokens.append(token)

            db.commit()

        except Exception as e:
            print(f"Batch {i//batch_size+1} failed: {e}")
            # Raise explicit error so FastAPI route can catch it
            raise HTTPException(status_code=502, detail="Translation server failed")
    return translated_tokens
HARDCODED_PAIRS = {
    "nllb-english-zeme": {"src": "eng_Latn", "tgt": "nzm_Latn"},
    "nllb-english-nagamese": {"src": "eng_Latn", "tgt": "nag_Latn"},
    "nllb-gujrathi-koli_kachchi": {"src": "guj_Gujr", "tgt": "gjk_Gujr"},
    "nllb-hindi-surjapuri": {"src": "hin_Deva", "tgt": "sjp_Deva"},
    "nllb-gujarati-kukna": {"src": "guj_Gujr", "tgt": "kex_Gujr"},
    "nllb-gujarati-kutchi": {"src": "guj_Gujr", "tgt": "kfr_Gujr"},
}

def generate_tokens_batch_stream(
    db: Session, project_id: UUID, book_id: UUID,model_name: str = "nllb-600M"
) -> Generator[str, None, None]:
    """
    Stream translation of tokens batch by batch.
    Yields Server-Sent Events (SSE) strings per token immediately after translation.
    Handles errors per batch and sends proper error messages to frontend.
    """
    import logging
    logger = logging.getLogger(__name__)

    # ✅ Log project, book, and model
    logger.info(f"Starting batch stream for project: {project_id}, book: {book_id}, model: {model_name}")

    # 1️⃣ Validate project
    project = db.query(Project).filter(Project.project_id == project_id).first()
    if not project:
        yield f"data: {json.dumps({'error': 'Project not found'})}\n\n"
        return
      # ✅ Add this to get the book object
    book = db.query(Book).filter(Book.book_id == book_id).first()
    if not book:
        yield f"data: {json.dumps({'error': 'Book not found'})}\n\n"
        return
    # 2️⃣ Fetch source and target languages
    source_lang_obj = None
    if project.source and project.source.language_id:
        source_lang_obj = db.query(Language).filter(
            Language.language_id == project.source.language_id
        ).first()

    target_lang_obj = None
    if project.target_language_id:
        target_lang_obj = db.query(Language).filter(
            Language.language_id == project.target_language_id
        ).first()

    # source_lang_code = source_lang_obj.BCP_code if source_lang_obj else None
    # target_lang_code = target_lang_obj.BCP_code if target_lang_obj else None
    if model_name == "nllb-600M":
     source_lang_code = source_lang_obj.BCP_code if source_lang_obj else None
     target_lang_code = target_lang_obj.BCP_code if target_lang_obj else None
    else:
     pair = HARDCODED_PAIRS.get(model_name)
     if not pair:
        yield f"data: {json.dumps({'error': f'No hardcoded language pair for model {model_name}'})}\n\n"
        return
    source_lang_code = pair["src"]
    target_lang_code = pair["tgt"]

     # ✅ Log language codes
    logger.info(f"Source lang code: {source_lang_code}, Target lang code: {target_lang_code}")
    if not source_lang_code or not target_lang_code:
        yield f"data: {json.dumps({'error': 'Source or target language not found'})}\n\n"
        return

    # 3️⃣ Fetch tokens for this book
    tokens = db.query(WordTokenTranslation).filter_by(
        project_id=project_id, book_id=book_id
    ).all()
    total = len(tokens)
    if not tokens:
        yield f"data: {json.dumps({'error': 'No tokens found for this project/book'})}\n\n"
        return

    # 4️⃣ Choose batch size
    if total > 300:
        batch_size = 50
    elif total > 100:
        batch_size = 30
    elif total > 50:
        batch_size = 20
    else:
        batch_size = 10

    # 5️⃣ Get access token once
    try:
        token = get_access_token()
    except Exception as e:
      error_msg = "Vachan login failed."
      yield f"data: {json.dumps({'error': error_msg})}\n\n"
      return

    # 6️⃣ Translate in batches
    success = True  # track if all batches succeeded

    for i in range(0, total, batch_size):
        batch = tokens[i:i+batch_size]
        texts = [t.token_text for t in batch]
        logger.info(f"Sending batch {i//batch_size + 1} to Vachan: texts={texts}, model={model_name}")

        try:
            job_id = request_translation(token, texts, source_lang_code, target_lang_code,model_name=model_name)

            # Poll translations per token
            for idx, translated_text in enumerate(poll_job_status(token, job_id)):
                token_obj = batch[idx]
                token_obj.translated_text = translated_text
                db.commit()

                # Yield per token immediately
                payload = {
                    "batch": i // batch_size + 1,
                    "done": i + idx + 1,
                    "total": total,
                    "token": {
                        "word_token_id": str(token_obj.word_token_id),
                        "token_text": token_obj.token_text,
                        "translated_text": translated_text
                    }
                }
                yield f"data: {json.dumps(payload)}\n\n"

        except Exception as e:
            import traceback
            full_error = traceback.format_exc()  # captures full stack trace
            logger.error(f"Batch {i//batch_size + 1} failed: {full_error}")

            error_payload = {
        "error": f"Batch {i//batch_size + 1} failed: {str(e)}",  # keep str(e) for frontend
        "details": full_error,  # optional, for internal debugging
        "finished": False
    }
            yield f"data: {json.dumps(error_payload)}\n\n"
            success = False
            return
    # 7️⃣ Final "done" event
    if success :
     yield f"data: {json.dumps({'done': total, 'total': total, 'finished': True})}\n\n"
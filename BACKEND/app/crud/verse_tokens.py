from uuid import uuid4, UUID
from sqlalchemy.orm import Session
from fastapi import HTTPException
from typing import Optional
import os
import httpx
import time
import logging
from dotenv import load_dotenv

# Import models
from app.models.project import Project
from app.models.verse import Verse
from app.models.chapter import Chapter
from app.models.book import Book
from app.models.verse_tokens import VerseTokenTranslation
from app.models.sources import Source
from app.models.languages import Language

# --------------------------------------------------
# Logging & Env Config
# --------------------------------------------------
logger = logging.getLogger(__name__)
load_dotenv()

VACHAN_LOGIN_URL = os.getenv("VACHAN_AUTH_URL")
VACHAN_TRANSLATE_URL = os.getenv("VACHAN_TRANSLATE_URL")
VACHAN_JOB_STATUS_URL = os.getenv("VACHAN_JOB_STATUS_URL")
VACHAN_USERNAME = os.getenv("VACHAN_USERNAME")
VACHAN_PASSWORD = os.getenv("VACHAN_PASSWORD")
VACHAN_MODEL_NAME = os.getenv("VACHAN_MODEL_NAME")

required_env_vars = [
    "VACHAN_AUTH_URL",
    "VACHAN_TRANSLATE_URL",
    "VACHAN_JOB_STATUS_URL",
    "VACHAN_USERNAME",
    "VACHAN_PASSWORD",
    "VACHAN_MODEL_NAME"
]

missing_vars = [var for var in required_env_vars if not os.getenv(var)]
if missing_vars:
    raise RuntimeError(f"Missing required environment variables: {', '.join(missing_vars)}")

MAX_RETRIES = 15
POLL_INTERVAL = 2  # seconds


# --------------------------------------------------
# Vachan AI Helper
# --------------------------------------------------
def get_vachan_token():
    """Login to Vachan AI and return access token."""
    try:
        resp = httpx.post(VACHAN_LOGIN_URL, data={
            "username": VACHAN_USERNAME,
            "password": VACHAN_PASSWORD
        })
        resp.raise_for_status()
        token = resp.json().get("access_token")
        if not token:
            raise HTTPException(status_code=500, detail="Vachan AI did not return an access token.")
        return token
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Vachan login failed: {str(e)}")


# --------------------------------------------------
# CRUD + Tokenization
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
    q = db.query(VerseTokenTranslation).filter(VerseTokenTranslation.project_id == project_id)
    if book_name:
        q = q.filter(VerseTokenTranslation.book_name == book_name)

    tokens = q.all()
    if not tokens:
        raise HTTPException(status_code=404, detail="No tokens found for this project.")

    return tokens


def get_verse_token_by_id(db: Session, verse_token_id: UUID):
    token_obj = db.query(VerseTokenTranslation).filter(
        VerseTokenTranslation.verse_token_id == verse_token_id
    ).first()
    if not token_obj:
        raise HTTPException(status_code=404, detail="Verse token not found")
    return token_obj


# --------------------------------------------------
# Translation Functions
# --------------------------------------------------
def translate_verse_token(db: Session, verse_token_id: UUID):
    token_obj = db.query(VerseTokenTranslation).filter_by(verse_token_id=verse_token_id).first()
    if not token_obj:
        raise HTTPException(status_code=404, detail="Verse token not found")

    project = db.query(Project).filter(Project.project_id == token_obj.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found for this verse token")

    source_obj = db.query(Source).filter(Source.source_id == project.source_id).first()
    if not source_obj:
        raise HTTPException(status_code=404, detail="Source not found for project")

    source_lang = db.query(Language).filter(Language.language_id == source_obj.language_id).first()
    target_lang = db.query(Language).filter(Language.language_id == project.target_language_id).first()
    if not source_lang or not target_lang:
        raise HTTPException(status_code=404, detail="Source/Target language not found")

    token = get_vachan_token()
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "Accept": "application/json"
    }
    url = f"{VACHAN_TRANSLATE_URL}?device=cpu&model_name={VACHAN_MODEL_NAME}&source_language={source_lang.BCP_code}&target_language={target_lang.BCP_code}"

    resp = httpx.post(url, json=[token_obj.token_text], headers=headers)
    resp.raise_for_status()

    job_id = resp.json().get("data", {}).get("jobId")
    if not job_id:
        raise HTTPException(status_code=500, detail=f"Vachan translation request failed: {resp.text}")

    logger.info(f" Vachan translation job created: {job_id}")

    status_url = f"{VACHAN_JOB_STATUS_URL}?job_id={job_id}"
    for attempt in range(MAX_RETRIES):
        status_resp = httpx.get(status_url, headers={"Authorization": f"Bearer {token}"})
        if status_resp.status_code == 404:
            logger.warning(f"Job {job_id} not found yet (attempt {attempt+1}/{MAX_RETRIES})")
            time.sleep(POLL_INTERVAL)
            continue

        status_resp.raise_for_status()
        data = status_resp.json().get("data", {})
        status = data.get("status", "").lower()
        logger.info(f" Job {job_id} status: {status}")

        if status == "job finished":
            translations = data.get("output", {}).get("translations", [])
            if translations:
                final_translation = translations[0].get("translatedText")
                if final_translation:
                    token_obj.verse_translated_text = final_translation
                    token_obj.is_reviewed = False
                    db.add(token_obj)
                    db.commit()
                    db.refresh(token_obj)
                    return token_obj
            raise HTTPException(status_code=500, detail="No translatedText found in output.")

        elif "failed" in status:
            raise HTTPException(status_code=500, detail="Vachan AI job failed.")

        time.sleep(POLL_INTERVAL)

    raise HTTPException(status_code=504, detail="Timeout waiting for Vachan AI translation.")


def manual_update_translation(db: Session, verse_token_id: UUID, new_translation: str):
    token_obj = db.query(VerseTokenTranslation).filter(
        VerseTokenTranslation.verse_token_id == verse_token_id
    ).first()
    if not token_obj:
        raise HTTPException(status_code=404, detail="Verse token not found")

    token_obj.verse_translated_text = new_translation
    token_obj.is_reviewed = True
    db.add(token_obj)
    db.commit()
    db.refresh(token_obj)
    return token_obj


# Book Translation
def translate_chunk(db: Session, project_id: UUID, book_name: str, skip: int = 0, limit: int = 10):
    # Get tokens for this chunk
    tokens = (
        db.query(VerseTokenTranslation)
        .filter(
            VerseTokenTranslation.project_id == project_id,
            VerseTokenTranslation.book_name == book_name
        )
        .order_by(VerseTokenTranslation.verse_id)  # keep verses in order
        .offset(skip)
        .limit(limit)
        .all()
    )
    if not tokens:
        raise HTTPException(status_code=404, detail="No tokens found for this chunk.")

    # Project + language info
    project = db.query(Project).filter(Project.project_id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")

    source_obj = db.query(Source).filter(Source.source_id == project.source_id).first()
    source_lang = db.query(Language).filter(Language.language_id == source_obj.language_id).first()
    target_lang = db.query(Language).filter(Language.language_id == project.target_language_id).first()

    if not source_lang or not target_lang:
        raise HTTPException(status_code=404, detail="Languages not found.")

    # Prepare request
    texts = [t.token_text for t in tokens]
    token = get_vachan_token()
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "Accept": "application/json"
    }

    url = (f"{VACHAN_TRANSLATE_URL}?device=cpu&model_name={VACHAN_MODEL_NAME}"
           f"&source_language={source_lang.BCP_code}&target_language={target_lang.BCP_code}")

    # Send request
    resp = httpx.post(url, json=texts, headers=headers)
    resp.raise_for_status()
    job_id = resp.json().get("data", {}).get("jobId")
    if not job_id:
        raise HTTPException(status_code=500, detail=f"Failed to create Vachan job: {resp.text}")

    # Poll status
    status_url = f"{VACHAN_JOB_STATUS_URL}?job_id={job_id}"
    for attempt in range(MAX_RETRIES):
        status_resp = httpx.get(status_url, headers={"Authorization": f"Bearer {token}"})
        status_resp.raise_for_status()
        data = status_resp.json().get("data", {})
        status = data.get("status", "").lower()

        if status == "job finished":
            translations = data.get("output", {}).get("translations", [])
            if not translations or len(translations) != len(tokens):
                raise HTTPException(status_code=500, detail="Mismatch in translations.")

            for token_obj, translated in zip(tokens, translations):
                token_obj.verse_translated_text = translated.get("translatedText")
                token_obj.is_reviewed = False
                db.add(token_obj)

            db.commit()
            return tokens

        elif "failed" in status:
            raise HTTPException(status_code=500, detail="Vachan AI job failed.")

        time.sleep(POLL_INTERVAL)

    raise HTTPException(status_code=504, detail="Timeout waiting for chunk translation.")


from uuid import uuid4
from fastapi import HTTPException
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from unittest.mock import patch, MagicMock

from app.models.sources import Source
from app.crud.verse_token_translation import create_verse_tokens_for_project, translate_verse_token, manual_update_translation
from app.models.book import Book
from app.models.chapter import Chapter
from app.models.project import Project
from app.models.verse import Verse
from app.main import app, get_db
from app.models.languages import Language
from app.models.verse_token_translation import VerseTokenTranslation

client = TestClient(app)

@pytest.fixture(scope="module")
def db_session():
    db = next(get_db())
    try:
        yield db
        db.commit()
    finally:
        db.close()

@pytest.fixture(scope="module")
def setup_project_with_tokens(db_session: Session):
    db = db_session

    # 1️⃣ Create Language
    language_id = uuid4()
    language = Language(
        language_id=language_id,
        name="Test Language",
        is_active=True
    )
    db.add(language)
    db.commit()

    # 2️⃣ Create Source
    source_id = uuid4()
    source = Source(
        source_id=source_id,
        language_id=language_id,
        language_name="Test Language",
        version_id=uuid4(),
        version_name="Test Version",
        description="Dummy source for testing",
        is_active=True
    )
    db.add(source)
    db.commit()

    # 3️⃣ Create Project
    project_id = uuid4()
    project = Project(
        project_id=project_id,
        name="Test Project",
        source_id=source_id,
        target_language_id=language_id,
        translation_type="word",
        status="created",
        is_active=True,
        progress=0,
        total_items=0,
        completed_items=0
    )
    db.add(project)
    db.commit()

    # 4️⃣ Create Book
    book = Book(
        book_id=uuid4(),
        source_id=source_id,
        book_code="GEN",
        book_name="Genesis",
        book_number=1,
        testament="OT",
        usfm_content="Dummy USFM content",
        is_active=True
    )
    db.add(book)
    db.commit()

    # 5️⃣ Create Chapter
    chapter = Chapter(
        chapter_id=uuid4(),
        book_id=book.book_id,
        chapter_number=1,
        is_active=True
    )
    db.add(chapter)
    db.commit()

    # 6️⃣ Create Verse
    verse = Verse(
        verse_id=uuid4(),
        chapter_id=chapter.chapter_id,
        verse_number=1,
        content="In the beginning God created the heaven and the earth.",
        usfm_tags="v1",
        is_active=True
    )
    db.add(verse)
    db.commit()

    # 7️⃣ Generate verse tokens
    create_verse_tokens_for_project(db, project_id)

    return (project_id, verse.verse_id)

def test_get_tokens_by_project(setup_project_with_tokens):
    project_id, _ = setup_project_with_tokens
    url = f"/verse-token-translation/verse-token-translations/by-project/{project_id}"
    response = client.get(url)
    assert response.status_code == 200, f"Unexpected status code: {response.status_code}"
    tokens = response.json()
    assert isinstance(tokens, list)
    assert len(tokens) > 0
    assert "verse_token_id" in tokens[0]

def test_get_token_by_id(setup_project_with_tokens):
    project_id, _ = setup_project_with_tokens
    list_response = client.get(f"/verse-token-translation/verse-token-translations/by-project/{project_id}")
    assert list_response.status_code == 200, "Unable to get tokens for valid project"
    tokens = list_response.json()
    if not tokens:
        pytest.skip("No tokens available for test")
    token_id = tokens[0]["verse_token_id"]

    response = client.get(f"/verse-token-translation/verse-token-translations/by-id/{token_id}")
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["verse_token_id"] == token_id

def test_project_not_found():
    invalid_id = uuid4()
    url = f"/verse-token-translation/verse-token-translations/by-project/{invalid_id}"
    response = client.get(url)
    assert response.status_code == 404
    assert response.json()["detail"] in ["No tokens found for this project.", "No verse tokens found for this project."]

def test_token_not_found():
    invalid_token = uuid4()
    url = f"/verse-token-translation/verse-token-translations/by-id/{invalid_token}"
    response = client.get(url)
    assert response.status_code == 404
    assert response.json()["detail"] in ["Verse token not found", "Verse token not found."]

@pytest.fixture
def sample_verse_token(db_session: Session, setup_project_with_tokens):
    project_id, verse_id = setup_project_with_tokens
    token = VerseTokenTranslation(
        verse_token_id=uuid4(),
        project_id=project_id,
        verse_id=verse_id,
        token_text="In the beginning",
        verse_translated_text=None,
        is_reviewed=False,
        is_active=True,
    )
    db_session.add(token)
    db_session.commit()
    yield token
    db_session.delete(token)
    db_session.commit()

def test_manual_update_translation_success(db_session: Session, sample_verse_token: VerseTokenTranslation):
    new_text = "शुरुआत में"
    updated_token = manual_update_translation(db_session, sample_verse_token.verse_token_id, new_text)

    assert updated_token.verse_translated_text == new_text
    assert updated_token.is_reviewed is True

def test_manual_update_translation_token_not_found(db_session: Session):
    invalid_id = uuid4()
    with pytest.raises(HTTPException) as exc_info:
        manual_update_translation(db_session, invalid_id, "some text")

    assert exc_info.value.status_code == 404
    assert "Verse token not found" in exc_info.value.detail

@patch("app.crud.verse_token_translation.httpx.get")
@patch("app.crud.verse_token_translation.httpx.post")
def test_translate_verse_token_success(mock_post, mock_get, db_session: Session, sample_verse_token: VerseTokenTranslation):
    # First POST is login, second POST is translation request

    mock_login_response = MagicMock(status_code=200)
    mock_login_response.json.return_value = {"access_token": "fake-access-token"}

    mock_translate_response = MagicMock(status_code=200)
    mock_translate_response.json.return_value = {"data": {"jobId": "fake-job-id"}}

    mock_post.side_effect = [mock_login_response, mock_translate_response]

    mock_get.return_value = MagicMock(status_code=200)
    mock_get.return_value.json.return_value = {
        "data": {
            "status": "job finished",
            "output": {
                "translations": [{"translatedText": "अनुवादित पाठ"}]
            }
        }
    }

    translated_token = translate_verse_token(db_session, sample_verse_token.verse_token_id)

    assert translated_token.verse_translated_text == "अनुवादित पाठ"
    assert translated_token.is_reviewed is False

@patch("app.crud.verse_token_translation.httpx.post")
@patch("app.crud.verse_token_translation.httpx.get")
def test_translate_verse_token_not_found(mock_get, mock_post, db_session: Session):
    # Mock POST login and translation request
    mock_login_response = MagicMock(status_code=200)
    mock_login_response.json.return_value = {"access_token": "fake-access-token"}

    mock_translate_response = MagicMock(status_code=200)
    mock_translate_response.json.return_value = {
        "data": {
            "status": "job failed",
            "output": None
        }
    }

    mock_post.side_effect = [mock_login_response, mock_translate_response]

    mock_get.return_value = mock_translate_response

    invalid_id = uuid4()
    with pytest.raises(HTTPException) as exc_info:
        translate_verse_token(db_session, invalid_id)

    assert exc_info.value.status_code == 404
    assert "Verse token not found" in exc_info.value.detail

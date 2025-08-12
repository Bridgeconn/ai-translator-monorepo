import uuid
from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal
from app.models.word_token_translation import WordTokenTranslation
from datetime import datetime
from uuid import UUID
from unittest.mock import patch

client = TestClient(app)

TEST_PROJECT_ID = "02fc6b11-402e-4e8d-b730-c09377813503"

# Updated URLs to match current double /api/api/... route prefix
GEN_TOKENS_URL = f"/word_tokens/word_tokens/generate/{TEST_PROJECT_ID}"
GET_TOKENS_BY_PROJECT_URL = f"/api/api/word_token_translation/project/{TEST_PROJECT_ID}"
UPDATE_TOKEN_URL = lambda token_id: f"/api/api/word_token_translation/{token_id}"
TRANSLATE_URL = "/api/api/word_token_translation/translate"


def test_generate_tokens():
    """Generate tokens for a project."""
    response = client.post(GEN_TOKENS_URL)
    assert response.status_code == 200
    assert response.json()["message"] == "Word tokens generated and stored with frequency."


def test_get_tokens_by_project():
    """Fetch tokens by project ID."""
    client.post(GEN_TOKENS_URL)
    response = client.get(GET_TOKENS_BY_PROJECT_URL)
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_update_token_translation():
    """Update a word token translation."""
    db = SessionLocal()
    token_id = uuid.uuid4()
    db_token = WordTokenTranslation(
        word_token_id=token_id,
        project_id=UUID(TEST_PROJECT_ID),
        token_text="truth",
        frequency=4,
        is_reviewed=False,
        is_active=True,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
        translated_text=None,
    )
    db.add(db_token)
    db.commit()
    db.refresh(db_token)
    db.close()

    payload = {
        "translated_text": "सत्य",
        "is_reviewed": True,
        "is_active": False
    }

    response = client.put(UPDATE_TOKEN_URL(token_id), json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["translated_text"] == "सत्य"
    assert data["is_reviewed"] is True
    assert data["is_active"] is False


def test_translate_word_token_mock():
    """Mock Vachan AI translation to avoid actual API call."""
    db = SessionLocal()
    token_id = uuid.uuid4()
    db_token = WordTokenTranslation(
        word_token_id=token_id,
        project_id=UUID(TEST_PROJECT_ID),
        token_text="peace",
        frequency=1,
        is_reviewed=False,
        is_active=True,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
        translated_text=None,
    )
    db.add(db_token)
    db.commit()
    db.refresh(db_token)
    db.close()

    # Patch the function where it's actually used inside vachan_ai
    with patch("app.crud.word_token_translation.translate_text_with_polling", return_value="शांति"):
        payload = {
            "word_token_id": str(token_id),
            "source_language": "en",
            "target_language": "hi"
        }
        response = client.post(TRANSLATE_URL, json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["translated_text"] == "शांति"


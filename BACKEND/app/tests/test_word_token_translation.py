import uuid
from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal
from app.models.word_token_translation import WordTokenTranslation
from datetime import datetime
from uuid import UUID

client = TestClient(app)
TEST_PROJECT_ID = "02fc6b11-402e-4e8d-b730-c09377813503"

def test_generate_tokens():
    response = client.post(f"/word_tokens/generate/{TEST_PROJECT_ID}")
    assert response.status_code == 200
    assert response.json()["message"] == "Word tokens generated and stored with frequency."

def test_get_tokens_by_project():
    # First generate
    client.post(f"/word_tokens/generate/{TEST_PROJECT_ID}")

    # Then query from correct route
    response = client.get(f"/api/word_tokens/project/{TEST_PROJECT_ID}")
    assert response.status_code == 200
    assert isinstance(response.json(), list)

def test_update_token_translation():
    # Step 1: Insert token manually
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

    # Step 2: Update via API
    payload = {
        "translated_text": "सत्य",
        "is_reviewed": True,
        "is_active": False
    }

    response = client.put(f"/api/word_tokens/{token_id}", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["translated_text"] == "सत्य"
    assert data["is_reviewed"] is True
    assert data["is_active"] is False

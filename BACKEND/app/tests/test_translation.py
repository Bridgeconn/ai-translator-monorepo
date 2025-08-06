import pytest
from fastapi.testclient import TestClient
from app.main import app
from uuid import uuid4
from app.database import get_db
from app.models.books import Book
from app.models.projects import Project
from app.models.translation import WordTokenTranslation
import json

client = TestClient(app)

@pytest.fixture
def setup_project(db_session):
    proj = Project(project_id=uuid4(), name="TestProj", source_id=uuid4(), target_language_id=uuid4(), translation_type="word", selected_books=[])
    db_session.add(proj)
    book = Book(book_id=uuid4(), source_id=proj.source_id, book_code="PSA", book_name="Psalms", book_number=19, testament="OT", usfm_content="\\v 1 Blessed Yahweh")
    db_session.add(book)
    db_session.commit()
    return proj

def test_generate_draft_no_tokens(setup_project):
    proj = setup_project
    response = client.post("/translation/generate", json={"project_id": str(proj.project_id)})
    assert response.status_code == 404
    assert response.json()["detail"] == "No translated words found"

def test_generate_draft_success(db_session, setup_project):
    proj = setup_project
    # create tokens
    t1 = WordTokenTranslation(word_token_id=uuid4(), project_id=proj.project_id, token_text="Blessed", translated_text="Benedict", is_active=True)
    t2 = WordTokenTranslation(word_token_id=uuid4(), project_id=proj.project_id, token_text="Yahweh", translated_text="Yahvé", is_active=True)
    db_session.add_all([t1, t2])
    db_session.commit()

    response = client.post("/translation/generate", json={"project_id": str(proj.project_id)})
    assert response.status_code == 201
    data = response.json()["data"]
    assert "Benedict" in data["content"]
    assert "Yahvé" in data["content"]
    assert data["format"] == "usfm"
    assert data["file_size"] == len(data["content"].encode("utf-8"))

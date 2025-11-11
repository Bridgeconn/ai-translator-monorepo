import os
import uuid
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text
from app.main import app
from app.database import SessionLocal

client = TestClient(app)
USFM_SAMPLE_PATH = "app/tests/sample.usfm"

# ---------- Setup/Cleanup ----------
@pytest.fixture(autouse=True)
def cleanup_books_and_sources():
    yield
    db = SessionLocal()
    try:
        db.execute(text("DELETE FROM verses"))
        db.execute(text("DELETE FROM chapters"))
        db.execute(text("DELETE FROM books"))
        db.execute(text("DELETE FROM sources WHERE version_name LIKE 'Test Book%'"))
        db.execute(text("DELETE FROM languages WHERE name = 'TestLang'"))
        db.execute(text("DELETE FROM versions WHERE version_name LIKE 'Test Book%'"))
        db.commit()
    finally:
        db.close()

def create_fake_language_id():
    lang_id = str(uuid.uuid4())
    db = SessionLocal()
    db.execute(
        text("""
            INSERT INTO languages (language_id, name, "ISO_code", "BCP_code", is_active)
            VALUES (:id, :name, :iso, :bcp, true)
        """),
        {
            "id": lang_id,
            "name": "TestLang",
            "iso": "TL",
            "bcp": "tl"
        }
    )
    db.commit()
    db.close()
    return lang_id

def create_fake_source(language_id):
    version_id = str(uuid.uuid4())
    db = SessionLocal()
    db.execute(
        text("""
            INSERT INTO versions (version_id, version_name, version_abbr)
            VALUES (:id, :name, :abbr)
        """),
        {"id": version_id, "name": "Test Book Upload Source", "abbr": "TBU"}
    )
    db.commit()
    db.close()

    response = client.post("/sources/", json={
        "language_id": language_id,
        "version_id": version_id,
        "version_name": "Test Book Upload Source",
        "version_abbreviation": "TBU",
        "description": "test desc"
    })
    assert response.status_code == 201
    return response.json()["data"]["source_id"]

def upload_usfm_file(source_id):
    assert os.path.exists(USFM_SAMPLE_PATH), f"Missing test file: {USFM_SAMPLE_PATH}"
    with open(USFM_SAMPLE_PATH, "rb") as file:
        response = client.post(
            f"/books/upload_books/?source_id={source_id}",
            files={"file": ("sample.usfm", file, "text/plain")}
        )
    assert response.status_code == 201
    return response.json()["data"]["book_id"]

# ---------- Tests ----------
def test_upload_usfm_file():
    lang_id = create_fake_language_id()
    source_id = create_fake_source(lang_id)
    book_id = upload_usfm_file(source_id)
    assert isinstance(book_id, str)

def test_get_all_books():
    response = client.get("/books/books")
    assert response.status_code == 200
    assert isinstance(response.json()["data"], list)

def test_get_book_by_id():
    lang_id = create_fake_language_id()
    source_id = create_fake_source(lang_id)
    book_id = upload_usfm_file(source_id)

    response = client.get(f"/books/{book_id}")
    assert response.status_code == 200
    assert response.json()["data"]["book_id"] == book_id

def test_delete_book():
    lang_id = create_fake_language_id()
    source_id = create_fake_source(lang_id)
    book_id = upload_usfm_file(source_id)

    delete_response = client.delete(f"/books/{book_id}")
    assert delete_response.status_code == 200
    assert "deleted successfully" in delete_response.json()["message"].lower()

    get_again = client.get(f"/books/{book_id}")
    assert get_again.status_code == 404

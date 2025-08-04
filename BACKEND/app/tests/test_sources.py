import os
import uuid
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text
from app.main import app
from app.database import SessionLocal

client = TestClient(app)

# ---------- Setup/Cleanup ----------
@pytest.fixture(autouse=True)
def cleanup_books_and_sources():
    yield  # Run the test
    db = SessionLocal()
    try:
        db.execute(text("DELETE FROM verses"))
        db.execute(text("DELETE FROM chapters"))
        db.execute(text("DELETE FROM books"))
        db.execute(text("DELETE FROM sources WHERE version_name LIKE 'Test Book%'"))
        db.execute(text("DELETE FROM languages WHERE name = 'TestLang'"))
        db.commit()
    finally:
        db.close()

def create_fake_language_id():
    db = SessionLocal()
    lang_id = str(uuid.uuid4())
    db.execute(
        text("INSERT INTO languages (id, name, code) VALUES (:id, :name, :code)"),
        {"id": lang_id, "name": "TestLang", "code": f"t{lang_id[:4]}"}
    )
    db.commit()
    db.close()
    return lang_id

def create_fake_source(language_id):
    response = client.post("/sources/", json={
        "source_language": "English",
        "version_name": "Test Book Upload Source",
        "version_abbreviation": "TBU",
        "language_id": language_id
    })
    return response.json()["data"]["source_id"]

# ---------- Tests ----------
def test_upload_usfm_file():
    lang_id = create_fake_language_id()
    source_id = create_fake_source(lang_id)

    file_path = "app/tests/sample.usfm"
    assert os.path.exists(file_path), "sample.usfm file not found in app/tests/"

    with open(file_path, "rb") as file:
        response = client.post(
            f"/books/upload/{source_id}",
            files={"file": ("sample.usfm", file, "text/plain")}
        )
    assert response.status_code == 201
    assert response.json()["message"] == "Book uploaded and parsed successfully"

def test_get_all_books():
    response = client.get("/books/")
    assert response.status_code == 200
    assert isinstance(response.json()["data"], list)

def test_get_book_by_id():
    lang_id = create_fake_language_id()
    source_id = create_fake_source(lang_id)

    file_path = "app/tests/sample.usfm"
    with open(file_path, "rb") as file:
        upload = client.post(f"/books/upload/{source_id}", files={"file": ("sample.usfm", file)})

    book_id = upload.json()["data"]["book_id"]
    response = client.get(f"/books/{book_id}")
    assert response.status_code == 200
    assert response.json()["data"]["book_id"] == book_id

def test_delete_book():
    lang_id = create_fake_language_id()
    source_id = create_fake_source(lang_id)

    file_path = "app/tests/sample.usfm"
    with open(file_path, "rb") as file:
        upload = client.post(f"/books/upload/{source_id}", files={"file": ("sample.usfm", file)})

    book_id = upload.json()["data"]["book_id"]

    delete_response = client.delete(f"/books/{book_id}")
    assert delete_response.status_code == 200
    assert "deleted successfully" in delete_response.json()["message"]

    get_again = client.get(f"/books/{book_id}")
    assert get_again.status_code == 404

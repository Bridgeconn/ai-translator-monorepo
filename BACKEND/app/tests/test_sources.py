import uuid
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text
from app.main import app
from app.database import SessionLocal

client = TestClient(app)
@pytest.fixture(autouse=True)
def cleanup_sources_and_languages():
    """
    Automatically runs before and after each test to clean up test sources and languages.
    """
    yield  # Run the test
    db = SessionLocal()
    try:
        db.execute(text("DELETE FROM sources WHERE version_name LIKE 'Test%' OR version_name LIKE 'Updated%'"))
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


def generate_source(language_id):
    return {
        "source_language": "English",
        "version_name": "Test Version",
        "version_abbreviation": "TST",
        "language_id": language_id
    }

def test_create_source_success():
    lang_id = create_fake_language_id()
    source = generate_source(lang_id)
    response = client.post("/sources/", json=source)
    assert response.status_code == 201
    data = response.json()["data"]
    assert data["version_name"] == source["version_name"]
    assert data["language_id"] == source["language_id"]

def test_create_source_invalid_language_id():
    bad_source = generate_source(language_id="invalid-uuid")
    response = client.post("/sources/", json=bad_source)
    assert response.status_code == 422  # UUID parsing error

def test_create_source_nonexistent_language_id():
    fake_lang_id = str(uuid.uuid4())
    bad_source = generate_source(fake_lang_id)
    response = client.post("/sources/", json=bad_source)
    assert response.status_code == 404
    assert "Language with ID" in response.json()["detail"]

def test_create_source_missing_fields():
    lang_id = create_fake_language_id()
    bad_source = {"version_name": "Test Version", "language_id": lang_id}
    response = client.post("/sources/", json=bad_source)
    assert response.status_code == 422

def test_get_all_sources():
    response = client.get("/sources/")
    assert response.status_code == 200
    assert isinstance(response.json()["data"], list)

def test_update_source_partial_success():
    lang_id = create_fake_language_id()
    source = generate_source(lang_id)
    created = client.post("/sources/", json=source).json()["data"]
    source_id = created["source_id"]  # fixed


    update_payload = {"version_name": "Updated Version"}
    response = client.put(f"/sources/{source_id}", json=update_payload)
    assert response.status_code == 200
    assert response.json()["data"]["version_name"] == "Updated Version"

def test_get_source_by_id():
    lang_id = create_fake_language_id()
    source = generate_source(lang_id)
    created = client.post("/sources/", json=source).json()["data"]
    source_id = created["source_id"]

    response = client.get(f"/sources/{source_id}")
    assert response.status_code == 200
    assert response.json()["data"]["source_id"] == source_id

def test_delete_source_success():
    lang_id = create_fake_language_id()
    source = generate_source(lang_id)
    created = client.post("/sources/", json=source).json()["data"]
    source_id = created["source_id"]

    response = client.delete(f"/sources/{source_id}")
    assert response.status_code == 200
    assert "deleted successfully" in response.json()["message"]

    # Confirm deletion
    response = client.get(f"/sources/{source_id}")
    assert response.status_code == 404

def test_delete_nonexistent_source():
    fake_id = str(uuid.uuid4())
    response = client.delete(f"/sources/{fake_id}")
    assert response.status_code == 404

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
    Runs before and after each test to clean up test data.
    """
    yield  # run the test
    db = SessionLocal()
    try:
        # Clean dependent tables respecting FK constraints
        db.execute(text("""
            DELETE FROM verses 
            WHERE chapter_id IN (
                SELECT chapter_id FROM chapters 
                WHERE book_id IN (
                    SELECT book_id FROM books 
                    WHERE source_id IN (
                        SELECT source_id FROM sources 
                        WHERE version_name LIKE 'Test%' OR version_name LIKE 'Updated%'
                    )
                )
            )
        """))
        db.execute(text("""
            DELETE FROM chapters 
            WHERE book_id IN (
                SELECT book_id FROM books 
                WHERE source_id IN (
                    SELECT source_id FROM sources 
                    WHERE version_name LIKE 'Test%' OR version_name LIKE 'Updated%'
                )
            )
        """))
        db.execute(text("""
            DELETE FROM books 
            WHERE source_id IN (
                SELECT source_id FROM sources 
                WHERE version_name LIKE 'Test%' OR version_name LIKE 'Updated%'
            )
        """))
        db.execute(text("""
            DELETE FROM sources 
            WHERE version_name LIKE 'Test%' OR version_name LIKE 'Updated%'
        """))
        db.execute(text("""
            DELETE FROM languages 
            WHERE name = 'TestLang'
        """))
        db.execute(text("""
            DELETE FROM versions 
            WHERE version_name = 'TestVersion'
        """))
        db.execute(text("DELETE FROM versions WHERE version_name LIKE 'Test%' OR version_name LIKE 'Updated%'"))
        db.commit()
    finally:
        db.close()

def create_fake_language_id():
    db = SessionLocal()
    lang_id = str(uuid.uuid4())
    db.execute(
        text("""
            INSERT INTO languages (language_id, name, "ISO_code") 
            VALUES (:id, :name, :code)
        """),
        {"id": lang_id, "name": "TestLang", "code": f"TST{lang_id[:4]}"}
    )
    db.commit()
    db.close()
    return lang_id

def create_fake_version_id():
    db = SessionLocal()
    version_id = str(uuid.uuid4())
    db.execute(
        text("""
            INSERT INTO versions (version_id, version_name, version_abbr) 
            VALUES (:id, :name, :abbr)
        """),
        {"id": version_id, "name": "TestVersion", "abbr": "TV"}
    )
    db.commit()
    db.close()
    return version_id

def generate_source(language_id, version_id):
    return {
        "language_id": language_id,
        "version_id": version_id,
        "description": "Sample test source"
    }

def test_create_source_success():
    lang_id = create_fake_language_id()
    ver_id = create_fake_version_id()
    source = generate_source(lang_id, ver_id)
    response = client.post("/sources/", json=source)
    assert response.status_code == 201, response.json()
    data = response.json().get("data")
    assert data is not None, response.json()
    assert data["version_id"] == ver_id
    assert data["language_id"] == lang_id

def test_create_source_invalid_language_id():
    ver_id = create_fake_version_id()
    bad_source = generate_source(language_id="invalid-uuid", version_id=ver_id)
    response = client.post("/sources/", json=bad_source)
    assert response.status_code == 422, response.json()

def test_create_source_nonexistent_language_id():
    ver_id = create_fake_version_id()
    fake_lang_id = str(uuid.uuid4())
    bad_source = generate_source(language_id=fake_lang_id, version_id=ver_id)
    response = client.post("/sources/", json=bad_source)
    assert response.status_code == 404, response.json()
    assert "Language with ID" in response.json().get("detail", "")

def test_create_source_missing_fields():
    lang_id = create_fake_language_id()
    # Missing version_id intentionally to trigger validation error
    bad_source = {
        "language_id": lang_id,
        "description": "Missing version_id"
    }
    response = client.post("/sources/", json=bad_source)
    assert response.status_code == 422, response.json()

def test_get_all_sources():
    response = client.get("/sources/")
    assert response.status_code == 200, response.json()
    data = response.json().get("data")
    assert isinstance(data, list)

def test_update_source_partial_success():
    lang_id = create_fake_language_id()
    ver_id = create_fake_version_id()
    source = generate_source(lang_id, ver_id)
    create_resp = client.post("/sources/", json=source)
    assert create_resp.status_code == 201, create_resp.json()
    created = create_resp.json().get("data")
    source_id = created["source_id"]

    update_payload = {"description": "Updated description"}
    response = client.put(f"/sources/{source_id}", json=update_payload)
    assert response.status_code == 200, response.json()
    data = response.json().get("data")
    assert data["description"] == "Updated description"

def test_get_source_by_id():
    lang_id = create_fake_language_id()
    ver_id = create_fake_version_id()
    source = generate_source(lang_id, ver_id)
    create_resp = client.post("/sources/", json=source)
    assert create_resp.status_code == 201, create_resp.json()
    created = create_resp.json().get("data")
    source_id = created["source_id"]

    response = client.get(f"/sources/{source_id}")
    assert response.status_code == 200, response.json()
    data = response.json().get("data")
    assert data["source_id"] == source_id

def test_delete_source_success():
    lang_id = create_fake_language_id()
    ver_id = create_fake_version_id()
    source = generate_source(lang_id, ver_id)
    create_resp = client.post("/sources/", json=source)
    assert create_resp.status_code == 201, create_resp.json()
    created = create_resp.json().get("data")
    source_id = created["source_id"]

    response = client.delete(f"/sources/{source_id}")
    assert response.status_code == 200, response.json()
    assert "deleted successfully" in response.json().get("message", "").lower()

    # Confirm deletion
    response = client.get(f"/sources/{source_id}")
    assert response.status_code == 404

def test_delete_nonexistent_source():
    fake_id = str(uuid.uuid4())
    response = client.delete(f"/sources/{fake_id}")
    assert response.status_code == 404
def test_create_duplicate_source_should_fail():
    db = SessionLocal()
    
    # Create language
    lang_id = str(uuid.uuid4())
    db.execute(
        text("""
            INSERT INTO languages (language_id, name, "ISO_code") 
            VALUES (:id, :name, :code)
        """),
        {"id": lang_id, "name": "TestLang", "code": f"TST{lang_id[:4]}"}
    )
    
    # Create version
    version_id = str(uuid.uuid4())
    db.execute(
        text("""
            INSERT INTO versions (version_id, version_name, version_abbr) 
            VALUES (:id, :name, :abbr)
        """),
        {"id": version_id, "name": "TestVersion", "abbr": "TV"}
    )
    db.commit()
    db.close()

    # First create source (should succeed)
    payload = {
        "language_id": lang_id,
        "version_id": version_id,
        "version_name": "Test Version",
        "version_abbreviation": "TST",
        "source_language": "English",
        "description": "First test source"
    }
    response1 = client.post("/sources/", json=payload)
    assert response1.status_code == 201

    # Try creating the same source again (should fail)
    response2 = client.post("/sources/", json=payload)
    assert response2.status_code == 400
    assert "already exists" in response2.json()["detail"]

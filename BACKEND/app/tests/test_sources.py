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
    Ensures deletion order respects FK constraints.
    """
    yield  # run the test
    db = SessionLocal()
    try:
        # --- Delete dependent data in the correct order ---
        
        # Delete word & verse token translations linked to projects
        db.execute(text("""
            DELETE FROM word_token_translation
            WHERE project_id IN (SELECT project_id FROM projects WHERE name LIKE 'Test%')
        """))
        db.execute(text("""
            DELETE FROM verse_token_translation
            WHERE project_id IN (SELECT project_id FROM projects WHERE name LIKE 'Test%')
        """))

        # Delete projects that reference test languages or names
        db.execute(text("""
            DELETE FROM projects
            WHERE name LIKE 'Test%'
               OR target_language_id IN (
                   SELECT language_id FROM languages WHERE name LIKE 'TestLang%'
               )
        """))

        # Delete verses → chapters → books (cascade manually)
        db.execute(text("""
            DELETE FROM verses 
            WHERE chapter_id IN (
                SELECT chapter_id FROM chapters 
                WHERE book_id IN (
                    SELECT book_id FROM books 
                    WHERE source_id IN (
                        SELECT source_id FROM sources WHERE version_name LIKE 'Test%'
                    )
                )
            )
        """))
        db.execute(text("""
            DELETE FROM chapters 
            WHERE book_id IN (
                SELECT book_id FROM books 
                WHERE source_id IN (
                    SELECT source_id FROM sources WHERE version_name LIKE 'Test%'
                )
            )
        """))
        db.execute(text("""
            DELETE FROM books 
            WHERE source_id IN (
                SELECT source_id FROM sources WHERE version_name LIKE 'Test%'
            )
        """))

        # Delete sources created during tests
        db.execute(text("""
            DELETE FROM sources 
            WHERE version_name LIKE 'Test%' OR version_name LIKE 'Updated%'
        """))

        # Delete test languages
        db.execute(text("""
            DELETE FROM languages 
            WHERE name LIKE 'TestLang%'
        """))

        # Delete test versions
        db.execute(text("""
            DELETE FROM versions 
            WHERE version_name LIKE 'Test%' OR version_name LIKE 'Updated%'
        """))

        db.commit()
    finally:
        db.close()



def create_fake_language_id():
    db = SessionLocal()
    lang_id = str(uuid.uuid4())
    unique_name = f"TestLang_{lang_id[:4]}"
    db.execute(
        text("""
            INSERT INTO languages (language_id, name, "ISO_code") 
            VALUES (:id, :name, :code)
        """),
        {"id": lang_id, "name": unique_name, "code": f"TST{lang_id[:4]}"}
    )
    db.commit()
    db.close()
    return lang_id


def create_fake_version_id():
    db = SessionLocal()
    version_id = str(uuid.uuid4())
    unique_name = f"TestVersion_{version_id[:4]}"
    db.execute(
        text("""
            INSERT INTO versions (version_id, version_name, version_abbr) 
            VALUES (:id, :name, :abbr)
        """),
        {"id": version_id, "name": unique_name, "abbr": f"TV{version_id[:4]}"}
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
        {"id": lang_id, "name": f"TestLang_{lang_id[:4]}", "code": f"TST{lang_id[:4]}"}
    )

    # Create version with unique name each run
    version_id = str(uuid.uuid4())
    unique_version_name = f"TestVersion_{version_id[:4]}"
    db.execute(
        text("""
            INSERT INTO versions (version_id, version_name, version_abbr) 
            VALUES (:id, :name, :abbr)
        """),
        {"id": version_id, "name": unique_version_name, "abbr": f"TV{version_id[:4]}"}
    )
    db.commit()
    db.close()

    # First create source (should succeed)
    payload = {
        "language_id": lang_id,
        "version_id": version_id,
        "version_name": unique_version_name,
        "version_abbreviation": f"TV{version_id[:4]}",
        "source_language": "English",
        "description": "First test source"
    }
    response1 = client.post("/sources/", json=payload)
    assert response1.status_code == 201, response1.json()

    # Try creating the same source again (should fail at source-level uniqueness)
    response2 = client.post("/sources/", json=payload)
    assert response2.status_code == 400, response2.json()
    assert "already exists" in response2.json()["detail"]

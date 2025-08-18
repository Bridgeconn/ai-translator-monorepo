import os
import uuid
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text
from app.main import app
from app.database import SessionLocal

client = TestClient(app)

# ------------------ Utility Functions ------------------
def get_any_existing_version(db_session):
    existing = db_session.execute(
        text("SELECT version_id FROM versions WHERE is_active = true LIMIT 1")
    ).fetchone()

    if existing:
        return str(existing[0])

    # Fallback: Insert TestVersion if no active version exists
    version_id = str(uuid.uuid4())
    db_session.execute(
        text("""
            INSERT INTO versions (version_id, version_name, version_abbr, is_active)
            VALUES (:id, :name, :abbr, true)
        """),
        {"id": version_id, "name": "TestVersion", "abbr": "TV"}
    )
    db_session.commit()
    return version_id


def upsert_language(db_session):
    existing = db_session.execute(
        text("SELECT language_id FROM languages WHERE name = 'TestLang'")
    ).fetchone()

    if existing:
        return str(existing[0])

    lang_id = str(uuid.uuid4())
    db_session.execute(
        text("""
            INSERT INTO languages (language_id, name, "ISO_code", "BCP_code", is_active)
            VALUES (:id, :name, :iso, :bcp, true)
        """),
        {"id": lang_id, "name": "TestLang", "iso": "TL", "bcp": "tl"}
    )
    db_session.commit()
    return lang_id
def create_source(language_id, version_id):
    source_payload = {
        "language_id": language_id,
        "version_id": version_id,
        "description": "Test Source for Projects"
    }
    # First check if the Source already exists
    existing = client.get(f"/sources/?language_id={language_id}&version_id={version_id}")
    if existing.status_code == 200 and existing.json()["data"]:
        return existing.json()["data"][0]["source_id"]  # Reuse existing source_id

    # Else, create new
    response = client.post("/sources/", json=source_payload)
    assert response.status_code == 201
    return response.json()["data"]["source_id"]


def create_and_login_user():
    user_data = {
        "username": "testuser",
        "email": "testuser@example.com",
        "password": "testpassword"
    }
    client.post("/users/", json=user_data)

    login_data = {
        "username": "testuser",
        "password": "testpassword"
    }
    response = client.post("/auth/login", data=login_data)
    assert response.status_code == 200
    token = response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    return headers

# ------------------ Fixtures ------------------
@pytest.fixture
def db_session():
    db = SessionLocal()
    yield db
    db.close()

@pytest.fixture
def create_test_version(db_session):
    return get_any_existing_version(db_session)


@pytest.fixture
def create_test_language(db_session):
    return upsert_language(db_session)

@pytest.fixture
def create_test_source(create_test_language, create_test_version):
    return create_source(create_test_language, create_test_version)

# ------------------ Tests ------------------
def test_create_project_success(create_test_language, create_test_source):
    headers = create_and_login_user()

    payload = {
        "name": "Test Project",
        "source_id": create_test_source,
        "target_language_id": create_test_language,
        "translation_type": "word",
        "selected_books": ["GEN", "EXO"],
        "is_active": True
    }

    response = client.post("/projects/", json=payload, headers=headers)
    assert response.status_code == 200
    response_data = response.json()
    assert "data" in response_data
    assert "project_id" in response_data["data"]

def test_create_project_unauthenticated():
    payload = {
        "name": "Unauthorized Project",
        "source_id": str(uuid.uuid4()),
        "target_language_id": str(uuid.uuid4()),
        "translation_type": "word",
        "selected_books": ["GEN"],
        "is_active": True
    }

    response = client.post("/projects/", json=payload)
    assert response.status_code == 401  # Unauthorized access

# ------------------ NEW TEST CASES ------------------
def test_get_project_by_id(create_test_language, create_test_source):
    headers = create_and_login_user()

    # Create Project
    payload = {
        "name": "Fetch Project",
        "source_id": create_test_source,
        "target_language_id": create_test_language,
        "translation_type": "word",
        "selected_books": ["GEN"],
        "is_active": True
    }
    create_response = client.post("/projects/", json=payload, headers=headers)
    assert create_response.status_code == 200
    project_id = create_response.json()["data"]["project_id"]

    # Fetch Project by ID
    response = client.get(f"/projects/{project_id}", headers=headers)
    assert response.status_code == 200
    response_data = response.json()

    # Validate response structure
    assert "data" in response_data
    assert isinstance(response_data["data"], list)  # Ensure it's a list
    assert len(response_data["data"]) == 1  # Should contain exactly one project

    project = response_data["data"][0]  # Get the first project

    # Validate project fields
    assert project["project_id"] == project_id
    assert project["name"] == "Fetch Project"
    assert project["source_id"] == create_test_source
    assert project["target_language_id"] == create_test_language
    assert project["translation_type"] == "word"

def test_get_all_projects():
    headers = create_and_login_user()
    response = client.get("/projects/", headers=headers)
    assert response.status_code == 200
    assert isinstance(response.json()["data"], list)

def test_update_project(create_test_language, create_test_source):
    headers = create_and_login_user()
    # Create project
    payload = {
        "name": "Project to Update",
        "source_id": create_test_source,
        "target_language_id": create_test_language,
        "translation_type": "word",
        "selected_books": ["GEN"],
        "is_active": True
    }
    create_response = client.post("/projects/", json=payload, headers=headers)
    assert create_response.status_code == 200
    project_id = create_response.json()["data"]["project_id"]

    # Update project
    update_payload = {
        "name": "Updated Project Name",
        "translation_type": "word",
        "selected_books": ["GEN", "EXO"],
        "is_active": False
    }
    update_response = client.put(f"/projects/{project_id}", json=update_payload, headers=headers)
    assert update_response.status_code == 200
    updated_data = update_response.json()["data"]
    assert updated_data["name"] == "Updated Project Name"
    # assert updated_data["is_active"] == False

def test_delete_project(create_test_language, create_test_source):
    headers = create_and_login_user()
    # Create project
    payload = {
        "name": "Project to Delete",
        "source_id": create_test_source,
        "target_language_id": create_test_language,
        "translation_type": "word",
        "selected_books": ["GEN"],
        "is_active": True
    }
    create_response = client.post("/projects/", json=payload, headers=headers)
    assert create_response.status_code == 200
    project_id = create_response.json()["data"]["project_id"]

    # Delete project
    delete_response = client.delete(f"/projects/{project_id}", headers=headers)
    assert delete_response.status_code == 200
    assert "deleted successfully" in delete_response.json()["message"].lower()

    # Verify it's deleted
    get_response = client.get(f"/projects/{project_id}", headers=headers)
    assert get_response.status_code == 404


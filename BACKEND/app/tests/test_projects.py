import os
import uuid
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text
from app.main import app
from app.database import SessionLocal, POSTGRES_SCHEMA

client = TestClient(app)
schema = POSTGRES_SCHEMA

# ------------------ Utility Functions ------------------
def get_any_existing_version(db_session):
    existing = db_session.execute(
        text(f"SELECT version_id FROM {schema}.versions WHERE is_active = true LIMIT 1")
    ).fetchone()

    if existing:
        return str(existing[0])

    version_id = str(uuid.uuid4())
    db_session.execute(
        text(f"""
            INSERT INTO {schema}.versions (version_id, version_name, version_abbr, is_active)
            VALUES (:id, :name, :abbr, true)
        """),
        {"id": version_id, "name": "TestVersion", "abbr": "TV"}
    )
    db_session.commit()
    return version_id


def upsert_language(db_session):
    existing = db_session.execute(
        text(f"SELECT language_id FROM {schema}.languages WHERE name = 'TestLang'")
    ).fetchone()

    if existing:
        return str(existing[0])

    lang_id = str(uuid.uuid4())
    db_session.execute(
        text(f"""
            INSERT INTO {schema}.languages (language_id, name, "ISO_code", "BCP_code", is_active)
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
    existing = client.get(f"/sources/?language_id={language_id}&version_id={version_id}")
    if existing.status_code == 200 and existing.json()["data"]:
        return existing.json()["data"][0]["source_id"]

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
    return {"Authorization": f"Bearer {token}"}


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


# Clean projects table before each test
@pytest.fixture(autouse=True)
def clean_projects_table(db_session):
    db_session.execute(text(f'TRUNCATE TABLE {schema}.projects CASCADE'))
    db_session.commit()


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

    # Test uniqueness: creating same project should fail
    duplicate_response = client.post("/projects/", json=payload, headers=headers)
    assert duplicate_response.status_code == 400
    assert "already exists" in duplicate_response.json()["detail"]


def test_create_project_unauthenticated(create_test_language, create_test_source):
    payload = {
        "name": "Unauthorized Project",
        "source_id": create_test_source,
        "target_language_id": create_test_language,
        "translation_type": "word",
        "selected_books": ["GEN"],
        "is_active": True
    }

    response = client.post("/projects/", json=payload)
    assert response.status_code == 401  # Unauthorized access


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
    project_id = create_response.json()["data"]["project_id"]

    # Fetch Project by ID
    response = client.get(f"/projects/{project_id}", headers=headers)
    assert response.status_code == 200
    response_data = response.json()
    assert "data" in response_data
    assert isinstance(response_data["data"], list)
    assert len(response_data["data"]) == 1

    project = response_data["data"][0]
    assert project["project_id"] == project_id
    assert project["name"] == "Fetch Project"

def test_get_all_projects(create_test_language, create_test_source):
    headers = create_and_login_user()

    # Create a project so the list endpoint returns at least one
    payload = {
        "name": "List Project",
        "source_id": create_test_source,
        "target_language_id": create_test_language,
        "translation_type": "word",
        "selected_books": ["GEN"],
        "is_active": True
    }
    client.post("/projects/", json=payload, headers=headers)

    response = client.get("/projects/", headers=headers)
    assert response.status_code == 200
    assert isinstance(response.json()["data"], list)
    assert len(response.json()["data"]) > 0


def test_update_project_success(create_test_language, create_test_source):
    headers = create_and_login_user()
    payload = {
        "name": "Project to Update",
        "source_id": create_test_source,
        "target_language_id": create_test_language,
        "translation_type": "word",
        "selected_books": ["GEN"],
        "is_active": True
    }
    create_response = client.post("/projects/", json=payload, headers=headers)
    project_id = create_response.json()["data"]["project_id"]

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


def test_delete_project(create_test_language, create_test_source):
    headers = create_and_login_user()
    payload = {
        "name": "Project to Delete",
        "source_id": create_test_source,
        "target_language_id": create_test_language,
        "translation_type": "word",
        "selected_books": ["GEN"],
        "is_active": True
    }
    create_response = client.post("/projects/", json=payload, headers=headers)
    project_id = create_response.json()["data"]["project_id"]

    delete_response = client.delete(f"/projects/{project_id}", headers=headers)
    assert delete_response.status_code == 200
    assert "deleted successfully" in delete_response.json()["message"].lower()

    get_response = client.get(f"/projects/{project_id}", headers=headers)
    assert get_response.status_code == 404


def test_update_project_no_changes(create_test_language, create_test_source):
    headers = create_and_login_user()
    payload = {
        "name": "No Change Project",
        "source_id": create_test_source,
        "target_language_id": create_test_language,
        "translation_type": "word",
        "selected_books": ["GEN"],
        "is_active": True
    }
    create_response = client.post("/projects/", json=payload, headers=headers)
    project_id = create_response.json()["data"]["project_id"]

    update_response = client.put(f"/projects/{project_id}", json=payload, headers=headers)
    assert update_response.status_code == 400
    assert update_response.json()["detail"] == "Nothing to update. All values are the same as the current project."


def test_update_project_duplicate_combination(create_test_language, create_test_source):
    headers = create_and_login_user()
    payload1 = {
        "name": "Project One",
        "source_id": create_test_source,
        "target_language_id": create_test_language,
        "translation_type": "word",
        "selected_books": ["GEN"],
        "is_active": True
    }
    response1 = client.post("/projects/", json=payload1, headers=headers)
    project1_id = response1.json()["data"]["project_id"]

    payload2 = {
        "name": "Project Two",
        "source_id": create_test_source,
        "target_language_id": create_test_language,
        "translation_type": "verse",
        "selected_books": ["EXO"],
        "is_active": True
    }
    response2 = client.post("/projects/", json=payload2, headers=headers)
    project2_id = response2.json()["data"]["project_id"]

    update_payload = {
        "name": "Project One",
        "source_id": create_test_source,
        "target_language_id": create_test_language,
        "translation_type": "word"
    }
    update_response = client.put(f"/projects/{project2_id}", json=update_payload, headers=headers)
    assert update_response.status_code == 400
    assert "already exists" in update_response.json()["detail"]


def test_update_project_invalid_source(create_test_language, create_test_source):
    headers = create_and_login_user()
    payload = {
        "name": "Project FK Test",
        "source_id": create_test_source,
        "target_language_id": create_test_language,
        "translation_type": "word",
        "selected_books": ["GEN"],
        "is_active": True
    }
    response = client.post("/projects/", json=payload, headers=headers)
    project_id = response.json()["data"]["project_id"]

    update_payload = {"source_id": str(uuid.uuid4())}
    update_response = client.put(f"/projects/{project_id}", json=update_payload, headers=headers)
    assert update_response.status_code == 400
    assert "Invalid source_id" in update_response.json()["detail"]

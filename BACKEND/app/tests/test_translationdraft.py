import uuid
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text
from app.main import app
from app.database import SessionLocal

client = TestClient(app)

def debug_response(resp):
    try:
        print("\n--- DEBUG RESPONSE ---")
        print("STATUS:", resp.status_code)
        print("BODY:", resp.json())
        print("----------------------\n")
    except Exception:
        print("\n--- DEBUG RAW RESPONSE ---")
        print("STATUS:", resp.status_code)
        print("TEXT:", resp.text)
        print("--------------------------\n")


def upsert_version(db):
    row = db.execute(text('SELECT version_id FROM versions WHERE is_active = true LIMIT 1')).fetchone()
    if row:
        return str(row[0])
    version_id = str(uuid.uuid4())
    suffix = version_id.split('-')[0]
    db.execute(
        text("""
            INSERT INTO versions (version_id, version_name, version_abbr, is_active)
            VALUES (:id, :name, :abbr, true)
        """),
        {"id": version_id, "name": f"DraftVer_{suffix}", "abbr": f"DV_{suffix}"}
    )
    db.commit()
    return version_id


def upsert_language(db):
    row = db.execute(text("SELECT language_id FROM languages WHERE name = 'DraftLang' LIMIT 1")).fetchone()
    if row:
        return str(row[0])
    language_id = str(uuid.uuid4())
    db.execute(
        text("""
            INSERT INTO languages (language_id, name, "ISO_code", "BCP_code", is_active)
            VALUES (:id, :name, :iso, :bcp, true)
        """),
        {"id": language_id, "name": "DraftLang", "iso": "DL", "bcp": "dl"}
    )
    db.commit()
    return language_id


def upsert_source(db, language_id, version_id):
    existing = db.execute(
        text("""
            SELECT source_id FROM sources
            WHERE language_id = :lang AND version_id = :ver AND is_active = true
            LIMIT 1
        """),
        {"lang": language_id, "ver": version_id}
    ).fetchone()
    if existing:
        return str(existing[0])
    source_id = str(uuid.uuid4())
    db.execute(
        text("""
            INSERT INTO sources
                (source_id, language_id, language_name, version_id, version_name, description, is_active)
            VALUES
                (:sid, :lang, :lname, :ver, :vname, :desc, true)
        """),
        {
            "sid": source_id,
            "lang": language_id,
            "lname": "DraftLang",
            "ver": version_id,
            "vname": "DraftVersion",
            "desc": "Source for draft tests"
        }
    )
    db.commit()
    return source_id


def create_and_login_user():
    client.post("/users/", json={
        "username": "draftuser",
        "email": "draftuser@example.com",
        "password": "draftpassword"
    })
    resp = client.post("/auth/login", data={"username": "draftuser", "password": "draftpassword"})
    debug_response(resp)
    assert resp.status_code == 200
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def create_project_via_api(headers, source_id, target_language_id):
    payload = {
        "name": "Draft Test Project",
        "source_id": source_id,
        "target_language_id": target_language_id,
        "translation_type": "ai-assisted",
        "selected_books": ["GEN"],
        "is_active": True
    }
    r = client.post("/projects/", json=payload, headers=headers)
    debug_response(r)
    assert r.status_code == 200
    return r.json()["data"]["project_id"]


def insert_book(db, source_id):
    row = db.execute(
        text("""
            SELECT book_id FROM books
            WHERE source_id = :sid AND book_code = 'GEN' LIMIT 1
        """),
        {"sid": source_id}
    ).fetchone()
    if row:
        return str(row[0])
    book_id = str(uuid.uuid4())
    db.execute(
        text("""
            INSERT INTO books
                (book_id, source_id, book_code, book_name, book_number, testament, usfm_content, is_active)
            VALUES
                (:bid, :sid, 'GEN', 'Genesis', 1, 'OT', 'USFM content placeholder', true)
        """),
        {"bid": book_id, "sid": source_id}
    )
    db.commit()
    return book_id


def insert_minimal_verse_and_token(db, project_id, book_id):
    chapter_id = str(uuid.uuid4())
    db.execute(
        text("""
            INSERT INTO chapters (chapter_id, book_id, chapter_number, is_active)
            VALUES (:cid, :bid, 1, true)
        """),
        {"cid": chapter_id, "bid": book_id}
    )
    verse_id = str(uuid.uuid4())
    db.execute(
        text("""
            INSERT INTO verses (verse_id, chapter_id, verse_number, verse_text, is_active)
            VALUES (:vid, :cid, 1, 'In the beginning...', true)
        """),
        {"vid": verse_id, "cid": chapter_id}
    )
    token_id = str(uuid.uuid4())
    db.execute(
        text("""
            INSERT INTO verse_token_translation
                (verse_token_id, project_id, verse_id, token_text, verse_translated_text,
                 is_reviewed, is_active, created_at, updated_at)
            VALUES
                (:tid, :pid, :vid, 'In', 'In the beginning (translated)...', false, true, now(), now())
        """),
        {"tid": token_id, "pid": project_id, "vid": verse_id}
    )
    db.commit()

@pytest.fixture
def db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@pytest.fixture
def setup_dependencies(db_session):
    version_id = upsert_version(db_session)
    language_id = upsert_language(db_session)
    source_id = upsert_source(db_session, language_id, version_id)
    headers = create_and_login_user()
    project_id = create_project_via_api(headers, source_id, language_id)
    book_id = insert_book(db_session, source_id)
    insert_minimal_verse_and_token(db_session, project_id, book_id)
    return headers, project_id, book_id


def test_create_draft_success(setup_dependencies):
    headers, project_id, book_id = setup_dependencies
    payload = {"project_id": project_id, "book_id": book_id, "draft_name": "My Test Draft"}
    r = client.post("/translation-drafts/", json=payload, headers=headers)
    debug_response(r)
    assert r.status_code == 200

def test_get_drafts_by_project(setup_dependencies):
    headers, project_id, book_id = setup_dependencies
    client.post("/translation-drafts/", json={"project_id": project_id, "book_id": book_id, "draft_name": "Project Draft"}, headers=headers)
    r = client.get(f"/translation-drafts/by-project/{project_id}", headers=headers)
    debug_response(r)
    assert r.status_code == 200

def test_update_draft(setup_dependencies):
    headers, project_id, book_id = setup_dependencies
    r_create = client.post("/translation-drafts/", json={"project_id": project_id, "book_id": book_id, "draft_name": "Old Draft"}, headers=headers)
    debug_response(r_create)
    draft_id = r_create.json()["draft_id"]
    r_update = client.put(f"/translation-drafts/{draft_id}", json={"draft_name": "Updated Draft", "content": "Updated content", "format": "usfm"}, headers=headers)
    debug_response(r_update)
    assert r_update.status_code == 200

def test_delete_draft(setup_dependencies):
    headers, project_id, book_id = setup_dependencies
    r_create = client.post("/translation-drafts/", json={"project_id": project_id, "book_id": book_id, "draft_name": "To Delete"}, headers=headers)
    debug_response(r_create)
    draft_id = r_create.json()["draft_id"]
    r_del = client.delete(f"/translation-drafts/{draft_id}", headers=headers)
    debug_response(r_del)
    assert r_del.status_code == 200

def test_download_draft(setup_dependencies):
    headers, project_id, book_id = setup_dependencies
    r_create = client.post("/translation-drafts/", json={"project_id": project_id, "book_id": book_id, "draft_name": "Download Me"}, headers=headers)
    debug_response(r_create)
    draft_id = r_create.json()["draft_id"]
    r_dl = client.get(f"/translation-drafts/download/{draft_id}", headers=headers)
    debug_response(r_dl)
    assert r_dl.status_code == 200

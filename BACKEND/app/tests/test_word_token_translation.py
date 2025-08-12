import uuid
from datetime import datetime
from sqlalchemy import text
from fastapi.testclient import TestClient
from unittest.mock import patch

from app.main import app
from app.database import SessionLocal
from app.models.word_token_translation import WordTokenTranslation

# Constants for test URLs
GEN_TOKENS_URL = "/word_tokens/word_tokens/generate"
GET_TOKENS_BY_PROJECT_URL = "/word_tokens/word_tokens/project"
UPDATE_TOKEN_URL = "/api/word_token_translation"

client = TestClient(app)


def cleanup_test_data():
    with SessionLocal() as db:
        db.execute(
            text(
                "DELETE FROM word_token_translation WHERE project_id IN "
                "(SELECT project_id FROM projects WHERE name LIKE 'TEST_%')"
            )
        )
        db.execute(
            text(
                "DELETE FROM verses WHERE chapter_id IN "
                "(SELECT chapter_id FROM chapters WHERE book_id IN "
                "(SELECT book_id FROM books WHERE source_id IN "
                "(SELECT source_id FROM projects WHERE name LIKE 'TEST_%')))"
            )
        )
        db.execute(
            text(
                "DELETE FROM chapters WHERE book_id IN "
                "(SELECT book_id FROM books WHERE source_id IN "
                "(SELECT source_id FROM projects WHERE name LIKE 'TEST_%'))"
            )
        )
        db.execute(
            text(
                "DELETE FROM books WHERE source_id IN "
                "(SELECT source_id FROM projects WHERE name LIKE 'TEST_%')"
            )
        )
        db.execute(
            text(
                "DELETE FROM projects WHERE name LIKE 'TEST_%'"
            )
        )
        db.commit()


def create_fake_source_project_book():
    cleanup_test_data()  # Clean before inserting new test data

    test_prefix = f"TEST_{uuid.uuid4().hex[:8]}"
    with SessionLocal() as db:
        # Insert Source
        source_id = uuid.uuid4()
        db.execute(
            text(
                "INSERT INTO sources (source_id, language_name, version_name, is_active) "
                "VALUES (:id, :language_name, :version_name, true)"
            ),
            {"id": source_id, "language_name": f"{test_prefix}_Lang", "version_name": f"{test_prefix}_Ver"}
        )
        db.commit()

        # Insert Project
        project_id = uuid.uuid4()
        db.execute(
            text(
                "INSERT INTO projects (project_id, name, source_id, translation_type, is_active) "
                "VALUES (:pid, :pname, :sid, :ttype, true)"
            ),
            {
                "pid": project_id,
                "pname": f"{test_prefix}_Project",
                "sid": source_id,
                "ttype": "test_translation"
            }
        )
        db.commit()

        # Insert Book
        book_id = uuid.uuid4()
        db.execute(
            text(
                "INSERT INTO books (book_id, source_id, book_code, book_name, book_number, testament, usfm_content, is_active) "
                "VALUES (:bid, :sid, :bcode, :bname, 1, 'OT', '', true)"
            ),
            {
                "bid": book_id,
                "sid": source_id,
                "bcode": "GEN",
                "bname": f"{test_prefix}_Genesis"
            }
        )
        db.commit()

    return test_prefix, project_id, f"{test_prefix}_Genesis"


def test_generate_tokens():
    test_prefix, project_id, book_name = create_fake_source_project_book()
    response = client.post(f"{GEN_TOKENS_URL}/{project_id}?book_name={book_name}")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, dict)
    assert "message" in data


def test_get_tokens_by_project():
    test_prefix, project_id, book_name = create_fake_source_project_book()
    client.post(f"{GEN_TOKENS_URL}/{project_id}?book_name={book_name}")

    response = client.get(f"{GET_TOKENS_BY_PROJECT_URL}/{project_id}?book_name={book_name}")
    assert response.status_code == 200
    tokens = response.json()
    assert isinstance(tokens, list)


def test_update_token_translation():
    test_prefix, project_id, book_name = create_fake_source_project_book()

    with SessionLocal() as db:
        token_id = uuid.uuid4()
        db_token = WordTokenTranslation(
            word_token_id=token_id,
            project_id=project_id,
            token_text="truth",
            frequency=4,
            is_reviewed=False,
            is_active=True,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
            translated_text=None,
            book_name=book_name,
        )
        db.add(db_token)
        db.commit()

    update_data = {
        "word_token_id": str(token_id),
        "translated_text": "सत्य",
        "is_reviewed": True
    }
    response = client.put(f"{UPDATE_TOKEN_URL}/{update_data['word_token_id']}", json=update_data)
    assert response.status_code == 200
    assert response.json()["translated_text"] == "सत्य"
    assert response.json()["is_reviewed"] is True



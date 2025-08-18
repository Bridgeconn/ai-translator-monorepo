import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.tests.test_word_token_translation import create_fake_source_project_book 

client = TestClient(app)

# Invalid IDs for negative test cases
INVALID_PROJECT_ID = "00000000-0000-0000-0000-000000000000"
INVALID_TOKEN_ID = "00000000-0000-0000-0000-000000000000"


def test_generate_tokens():
    test_prefix, project_id, book_name = create_fake_source_project_book()
    url = f"/verse_tokens/generate-verse-tokens/{project_id}?book_name={book_name}"
    response = client.post(url)
    assert response.status_code == 200
    data = response.json()
    assert "message" in data
    assert "verse tokens created successfully" in data["message"]


def test_get_tokens_by_project():
    test_prefix, project_id, book_name = create_fake_source_project_book()
    # Ensure tokens are generated first
    client.post(f"/verse_tokens/generate-verse-tokens/{project_id}?book_name={book_name}")

    url = f"/verse_tokens/verse-tokens/by-project/{project_id}?book_name={book_name}"
    response = client.get(url)
    assert response.status_code == 200
    tokens = response.json()
    assert isinstance(tokens, list)
    if tokens:
        assert "verse_token_id" in tokens[0]
        assert tokens[0]["project_id"] == str(project_id)


def test_get_token_by_id():
    test_prefix, project_id, book_name = create_fake_source_project_book()
    # Generate tokens
    client.post(f"/verse_tokens/generate-verse-tokens/{project_id}?book_name={book_name}")

    list_response = client.get(f"/verse_tokens/verse-tokens/by-project/{project_id}?book_name={book_name}")
    assert list_response.status_code == 200, "Unable to get tokens for valid project"
    tokens = list_response.json()
    if not tokens:
        pytest.skip("No tokens available for test")

    token_id = tokens[0]["verse_token_id"]

    response = client.get(f"/verse_tokens/verse-tokens/by-id/{token_id}")
    assert response.status_code == 200
    data = response.json()
    assert "data" in data
    assert data["data"]["verse_token_id"] == token_id


def test_project_not_found():
    url = f"/verse_tokens/verse-tokens/by-project/{INVALID_PROJECT_ID}"
    response = client.get(url)
    assert response.status_code == 404
    assert response.json()["detail"] == "No verse tokens found for this project."


def test_token_not_found():
    url = f"/verse_tokens/verse-tokens/by-id/{INVALID_TOKEN_ID}"
    response = client.get(url)
    assert response.status_code == 404
    assert response.json()["detail"] == "Verse token not found."

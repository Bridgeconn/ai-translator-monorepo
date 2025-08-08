import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

#Use your working values
VALID_PROJECT_ID = "db8886ea-fd90-48cc-b33e-b2cc03571f16"
INVALID_PROJECT_ID = "00000000-0000-0000-0000-000000000000"
INVALID_TOKEN_ID = "00000000-0000-0000-0000-000000000000"

def test_get_tokens_by_project():
    url = f"/verse-token-translation/verse-token-translations/by-project/{VALID_PROJECT_ID}"
    response = client.get(url)
    assert response.status_code == 200, f"Unexpected status code: {response.status_code}"
    tokens = response.json()
    assert isinstance(tokens, list)
    assert len(tokens) > 0
    assert "verse_token_id" in tokens[0]

def test_get_token_by_id():
    # First get one token from the valid project
    list_response = client.get(f"/verse-token-translation/verse-token-translations/by-project/{VALID_PROJECT_ID}")
    assert list_response.status_code == 200, "Unable to get tokens for valid project"
    tokens = list_response.json()
    if not tokens:
        pytest.skip("No tokens available for test")
    token_id = tokens[0]["verse_token_id"]

    response = client.get(f"/verse-token-translation/verse-token-translations/by-id/{token_id}")
    assert response.status_code == 200
    data = response.json()
    assert "data" in data
    assert data["data"]["verse_token_id"] == token_id

def test_project_not_found():
    url = f"/verse-token-translation/verse-token-translations/by-project/{INVALID_PROJECT_ID}"
    response = client.get(url)
    assert response.status_code == 404
    assert response.json()["detail"] == "No verse tokens found for this project."

def test_token_not_found():
    url = f"/verse-token-translation/verse-token-translations/by-id/{INVALID_TOKEN_ID}"
    response = client.get(url)
    assert response.status_code == 404
    assert response.json()["detail"] == "Verse token not found."

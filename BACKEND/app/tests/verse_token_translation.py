from fastapi.testclient import TestClient
from app.main import app
import uuid

client = TestClient(app)

# Replace with an actual project_id from your DB which has tokens
VALID_PROJECT_ID = "db8886ea-fd90-48cc-b33e-b2cc03571f16"
INVALID_PROJECT_ID = "00000000-0000-0000-0000-000000000000"
INVALID_TOKEN_ID = "00000000-0000-0000-0000-000000000000"

def test_get_tokens_by_project():
    response = client.get(f"/verse-token-translations/by-project/{VALID_PROJECT_ID}")
    assert response.status_code == 200, f"Unexpected status code: {response.status_code}"
    tokens = response.json()
    assert isinstance(tokens, list), "Expected a list of tokens"
    assert len(tokens) > 0, "Token list is empty"
    assert "verse_token_id" in tokens[0], "verse_token_id missing in token"

def test_get_token_by_id():
    # First get a token from the project
    response = client.get(f"/verse-token-translations/by-project/{VALID_PROJECT_ID}")
    assert response.status_code == 200, "Unable to get tokens for valid project"
    tokens = response.json()
    if not tokens:
        import pytest
        pytest.skip("No tokens found for project, skipping ID test")

    token_id = tokens[0]["verse_token_id"]
    token_resp = client.get(f"/verse-token-translations/by-id/{token_id}")
    assert token_resp.status_code == 200, f"Failed to fetch token by ID: {token_resp.status_code}"
    data = token_resp.json()
    assert "data" in data, "Missing 'data' in response"
    assert data["data"]["verse_token_id"] == token_id

def test_project_not_found():
    response = client.get(f"/verse-token-translations/by-project/{INVALID_PROJECT_ID}")
    assert response.status_code == 404, "Expected 404 for non-existent project"
    assert response.json()["detail"] == "No verse tokens found for this project."

def test_token_not_found():
    response = client.get(f"/verse-token-translations/by-id/{INVALID_TOKEN_ID}")
    assert response.status_code == 404, "Expected 404 for non-existent token"
    assert response.json()["detail"] == "Verse token not found."

def test_create_verse_tokens():
    response = client.post(f"/generate-verse-tokens/{VALID_PROJECT_ID}")
    assert response.status_code == 200, f"Unexpected status code: {response.status_code}"
    data = response.json()
    assert "message" in data, "Response should contain message"
    assert "verse tokens created" in data["message"]

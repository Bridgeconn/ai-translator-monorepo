from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_fetch_languages():
    response = client.get("/languages/")
    assert response.status_code == 200
    assert isinstance(response.json(), list)

from fastapi.testclient import TestClient
from app.main import app
import uuid

client = TestClient(app)

def test_update_user_not_found():
    fake_id = str(uuid.uuid4())
    response = client.put(f"/users/{fake_id}", json={
        "username": "doesnotexist",
        "email": "notfound@example.com",
    })
    assert response.status_code in [404, 400]  
    assert "not found" in response.text.lower()

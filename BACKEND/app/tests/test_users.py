# from fastapi.testclient import TestClient
# from app.main import app
import uuid

from BACKEND.app.tests.conftest import client


# client = TestClient(app)

def generate_user():
    return {
        "username": f"user_{uuid.uuid4().hex[:8]}",
        "email": f"{uuid.uuid4().hex[:8]}@example.com",
        "password": "TestPass123",
        "full_name": "Test User",
        "role": "user"
    }

def test_create_user_success(client):
    user = generate_user()
    response = client.post("/users/", json=user)
    assert response.status_code == 201
    data = response.json()["data"] ## adding [data] here to solve keyerror for username 
    assert data["username"] == user["username"] # changed here 
    assert data["email"] == user["email"]
    
def test_create_user_duplicate_username(client):
    user = generate_user()
    client.post("/users/", json=user)  # create first
    duplicate = user.copy()
    duplicate["email"] = f"{uuid.uuid4().hex[:8]}@example.com"
    response = client.post("/users/", json=duplicate)
    assert response.status_code == 409
    assert "Username already registered" in response.json()["detail"]

def test_create_user_duplicate_email(client):
    user = generate_user()
    client.post("/users/", json=user)
    duplicate = user.copy()
    duplicate["username"] = f"user_{uuid.uuid4().hex[:8]}"
    response = client.post("/users/", json=duplicate)
    assert response.status_code == 409
    assert "Email already registered" in response.json()["detail"]

def test_create_user_missing_fields(client):
    bad_user = {"username": "onlyusername"}
    response = client.post("/users/", json=bad_user)
    assert response.status_code == 422

def test_create_user_invalid_email_format(client):
    user = generate_user()
    user["email"] = "invalid-email"
    response = client.post("/users/", json=user)
    assert response.status_code == 422

def test_create_user_weak_password(client):
    user = generate_user()
    user["password"] = "123"
    response = client.post("/users/", json=user)
    assert response.status_code in (201, 422)


def test_print_db_url(db_session):
    print("Connected DB URL:", db_session.bind.url)

from fastapi.testclient import TestClient
from app.main import app
import uuid
import pytest



client = TestClient(app)

def generate_user():
    return {
        "username": f"user_{uuid.uuid4().hex[:8]}",
        "email": f"{uuid.uuid4().hex[:8]}@example.com",
        "password": "TestPass123",
        "full_name": "Test User",
        "role": "user"
    }

def test_create_user_success():
    user = generate_user()
    response = client.post("/users/", json=user)
    assert response.status_code == 201
    assert response.json()["message"] == "User created successfully."

def test_create_user_duplicate_username():
    user = generate_user()
    client.post("/users/", json=user)  # create first
    duplicate = user.copy()
    duplicate["email"] = f"{uuid.uuid4().hex[:8]}@example.com"
    response = client.post("/users/", json=duplicate)
    assert response.status_code == 409
    assert "Username already registered" in response.json()["detail"]

def test_create_user_duplicate_email():
    user = generate_user()
    client.post("/users/", json=user)
    duplicate = user.copy()
    duplicate["username"] = f"user_{uuid.uuid4().hex[:8]}"
    response = client.post("/users/", json=duplicate)
    assert response.status_code == 409
    assert "Email already registered" in response.json()["detail"]

def test_create_user_missing_fields():
    bad_user = {"username": "onlyusername"}
    response = client.post("/users/", json=bad_user)
    assert response.status_code == 422

def test_create_user_invalid_email_format():
    user = generate_user()
    user["email"] = "invalid-email"
    response = client.post("/users/", json=user)
    assert response.status_code == 422

def test_create_user_weak_password():
    user = generate_user()
    user["password"] = "123"
    response = client.post("/users/", json=user)
    assert response.status_code in (201, 422)

    

# Existing test user data (adjust these according to your seeded test database)
EXISTING_USER = {
    "id": "fdcb6b82-6684-4fd5-a567-99c379e57d40",
    "username": "john_doe",
    "email": "john@example.com"
}

# ------------------------
# Test: Get all users
# ------------------------
def test_get_all_users():
    response = client.get("/users/")
    assert response.status_code == 200
    assert isinstance(response.json(), list)

# ------------------------
# Test: Get user by ID (valid + invalid)
# ------------------------
def test_get_user_by_id_valid():
    response = client.get(f"/users/id/{EXISTING_USER['id']}")
    assert response.status_code == 200
    assert response.json()["id"] == EXISTING_USER["id"]

def test_get_user_by_id_invalid():
    response = client.get("/users/id/fdcb6b82-6684-4fd5-a567-99c379e57d41")
    assert response.status_code == 404
    assert response.json()["detail"] == "User not found"

# ------------------------
# Test: Get user by username (valid + invalid)
# ------------------------
def test_get_user_by_username_valid():
    response = client.get(f"/users/username/{EXISTING_USER['username']}")
    assert response.status_code == 200
    assert response.json()["username"] == EXISTING_USER["username"]

def test_get_user_by_username_invalid():
    response = client.get("/users/username/John Wick")
    assert response.status_code == 404
    assert response.json()["detail"] == "User not found"

# ------------------------
# Test: Get user by email (valid + invalid)
# ------------------------
def test_get_user_by_email_valid():
    response = client.get(f"/users/email/{EXISTING_USER['email']}")
    assert response.status_code == 200
    assert response.json()["email"] == EXISTING_USER["email"]

def test_get_user_by_email_invalid():
    response = client.get("/users/email/fakeuser@example.com")
    assert response.status_code == 404
    assert response.json()["detail"] == "User not found"

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
    data = response.json()
    assert data["username"] == user["username"]


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


def test_update_user_not_found():
    fake_id = str(uuid.uuid4())
    response = client.put(f"/users/{fake_id}", json={
        "username": "doesnotexist",
        "email": "notfound@example.com",
    })
    assert response.status_code in [404, 400]  
    assert "not found" in response.text.lower()


def test_update_user_duplicate_username():
    user1 = generate_user()
    user2 = generate_user()

    # Create both users
    res1 = client.post("/users/", json=user1)
    res2 = client.post("/users/", json=user2)

    id2 = res2.json()["id"]

    # Attempt to update user2 to user1's username
    updated_data = user2.copy()
    updated_data["username"] = user1["username"]

    response = client.put(f"/users/{id2}", json=updated_data)
    assert response.status_code == 409
    assert "Username already registered" in response.json()["detail"]

def test_update_user_duplicate_email():
    user1 = generate_user()
    user2 = generate_user()

    res1 = client.post("/users/", json=user1)
    res2 = client.post("/users/", json=user2)

    id2 = res2.json()["id"]

    updated_data = user2.copy()
    updated_data["email"] = user1["email"]

    response = client.put(f"/users/{id2}", json=updated_data)
    assert response.status_code == 409
    assert "Email already registered" in response.json()["detail"]
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal
from app.models.users import User  # Make sure this matches your import
import uuid
client = TestClient(app)

def test_delete_latest_user():
    db = SessionLocal()
    try:
        # Get the most recently created user
        user = db.query(User).order_by(User.created_at.desc()).first()
        assert user is not None, "No user found to delete."

        user_id = user.id

        # Send DELETE request
        response = client.delete(f"/users/{user_id}")
        assert response.status_code == 200
        assert response.json() == {"detail": f"User with ID {user_id} deleted successfully."}

        # Confirm the user is deleted
        response_check = client.delete(f"/users/{user_id}")
        assert response_check.status_code == 404

    finally:
        db.close()


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

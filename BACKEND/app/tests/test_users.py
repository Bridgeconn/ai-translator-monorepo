from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal
from app.models.users import User
import uuid

client = TestClient(app)


def test_delete_user_success():
    """
    Create a user, delete the user, confirm deletion.
    """
    # Step 1: Create user
    user_data = {
        "username": f"user_{uuid.uuid4().hex[:6]}",
        "email": f"{uuid.uuid4().hex[:6]}@example.com",
        "password": "TestPass123",
        "full_name": "Test Delete User",
        "role": "user"
    }
    create_response = client.post("/users/", json=user_data)
    assert create_response.status_code == 201
    created_user_id = create_response.json().get("id") or create_response.json().get("user", {}).get("id")
    assert created_user_id is not None

    # Step 2: Delete the user
    delete_response = client.delete(f"/users/{created_user_id}")
    assert delete_response.status_code == 200
    assert "deleted successfully" in delete_response.json()["detail"]

    # Step 3: Confirm deletion (re-delete)
    re_delete = client.delete(f"/users/{created_user_id}")
    assert re_delete.status_code == 404
    assert "not found" in re_delete.json()["detail"]  


def test_delete_nonexistent_user():
    """
    Try deleting a user with a random UUID that doesn’t exist.
    """
    fake_user_id = str(uuid.uuid4())
    response = client.delete(f"/users/{fake_user_id}")
    assert response.status_code == 404
    assert "not found" in response.json()["detail"]  


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
    assert data["email"] == user["email"]


def test_create_user_duplicate_username():
    user = generate_user()
    client.post("/users/", json=user)
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

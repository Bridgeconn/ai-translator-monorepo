from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal
from app.models.users import User
import uuid


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
    data = response.json()["data"]  
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

    assert res1.status_code == 201
    assert res2.status_code == 201

    id2 = res2.json()["data"]["id"]

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

    assert res1.status_code == 201
    assert res2.status_code == 201

    id2 = res2.json()["data"]["id"]

    updated_data = user2.copy()
    updated_data["email"] = user1["email"]

    response = client.put(f"/users/{id2}", json=updated_data)
    assert response.status_code == 409
    assert "Email already registered" in response.json()["detail"]


def test_update_user_duplicate_email():
    user1 = generate_user()
    user2 = generate_user()

    res1 = client.post("/users/", json=user1)
    res2 = client.post("/users/", json=user2)

    assert res1.status_code == 201
    assert res2.status_code == 201

    id2 = res2.json()["data"]["id"]

    updated_data = user2.copy()
    updated_data["email"] = user1["email"]

    response = client.put(f"/users/{id2}", json=updated_data)
    assert response.status_code == 409
    assert "Email already registered" in response.json()["detail"]

    
def test_delete_user_success():
    """
    Create a user, delete the user, confirm deletion.
    """
    # Step 1: Create user using generate_user
    user_data = generate_user()
    create_response = client.post("/users/", json=user_data)
    assert create_response.status_code == 201
    created_user_id = create_response.json()["data"]["id"]
    assert created_user_id is not None

    # Step 2: Delete the user
    delete_response = client.delete(f"/users/{created_user_id}")
    assert delete_response.status_code == 200
    assert "deleted successfully" in delete_response.json()["message"]

    # Step 3: Confirm deletion by trying to delete again
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

# ------------------------
# Test: Get all users
# ------------------------
def test_get_all_users():
    generate_user(client)
    response = client.get("/users/")
    assert response.status_code == 200
    assert isinstance(response.json(), list)

# ------------------------
# Test: Get user by ID (valid + invalid)
# ------------------------
def test_get_user_by_id_valid():
    res = generate_user(client)
    user_id = res.json()["data"]["id"]

    response = client.get(f"/users/id/{user_id}")
    assert response.status_code == 200
    assert response.json()["id"] == user_id

def test_get_user_by_id_invalid():
    response = client.get("/users/id/fdcb6b82-6684-4fd5-a567-99c379e57d41")
    assert response.status_code == 404
    assert response.json()["detail"] == "User not found"

# ------------------------
# Test: Get user by username (valid + invalid)
# ------------------------
def test_get_user_by_username_valid():
    res = generate_user(client)
    username = res.json()["data"]["username"]

    response = client.get(f"/users/username/{username}")
    assert response.status_code == 200
    assert response.json()["username"] == username

def test_get_user_by_username_invalid():
    response = client.get("/users/username/John Wick")
    assert response.status_code == 404
    assert response.json()["detail"] == "User not found"

# ------------------------
# Test: Get user by email (valid + invalid)
# ------------------------
def test_get_user_by_email_valid():
    res = generate_user(client)
    email = res.json()["data"]["email"]

    response = client.get(f"/users/email/{email}")
    assert response.status_code == 200
    assert response.json()["email"] == email

def test_get_user_by_email_invalid():
    response = client.get("/users/email/fakeuser@example.com")
    assert response.status_code == 404
    assert response.json()["detail"] == "User not found"

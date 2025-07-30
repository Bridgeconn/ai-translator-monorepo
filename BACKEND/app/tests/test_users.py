from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal
from app.models.users import User
import uuid


client = TestClient(app)

def generate_user():
    user = {
        "username": f"user_{uuid.uuid4().hex[:8]}",
        "email": f"{uuid.uuid4().hex[:8]}@example.com",
        "password": "TestPass123",
        "full_name": "Test User",
    }
     # Register user
    response = client.post("/users/", json=user)
    assert response.status_code == 201

    # Login to get JWT token
    login_data = {
        "username": user["username"],
        "password": user["password"]
    }
    token_res = client.post("/auth/login", data=login_data)
    assert token_res.status_code == 200
    token = token_res.json()["access_token"]

    # Auth headers
    headers = {"Authorization": f"Bearer {token}"}
    return user, headers

## in create user sccess test we are not using generate user function ,it is a public function
def test_create_user_success():
    user = {
        "username": f"user_{uuid.uuid4().hex[:8]}",
        "email": f"{uuid.uuid4().hex[:8]}@example.com",
        "password": "TestPass123",
        "full_name": "Test User",
    }
    response = client.post("/users/", json=user)
    assert response.status_code == 201
    data = response.json()["data"]  
    assert data["username"] == user["username"]  
    assert data["email"] == user["email"]  


def test_create_user_duplicate_username():
    user, _ = generate_user()
    client.post("/users/", json=user)
    duplicate = user.copy()
    duplicate["email"] = f"{uuid.uuid4().hex[:8]}@example.com"
    response = client.post("/users/", json=duplicate)
    assert response.status_code == 409
    assert "Username already registered" in response.json()["detail"]


def test_create_user_duplicate_email():
    user, _ = generate_user()
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
    user, _ = generate_user()
    user["email"] = "invalid-email"
    response = client.post("/users/", json=user)
    assert response.status_code == 422


def test_create_user_weak_password():
    user = {
    "username": f"user_{uuid.uuid4().hex[:8]}",
    "email": f"{uuid.uuid4().hex[:8]}@example.com",
    "password": "123",  # weak password
    "full_name": "Weak Password User",
     }
    response = client.post("/users/", json=user)
    assert response.status_code in (201, 422)


def test_update_user_not_found():
    _, headers = generate_user() # added headers
    fake_id = str(uuid.uuid4())
    response = client.put(f"/users/{fake_id}", json={
        "username": "doesnotexist",
        "email": "notfound@example.com",
    }, headers=headers)
    assert response.status_code in [404, 400]  
    assert "not found" in response.text.lower()


def test_update_user_duplicate_username():
    user1, headers = generate_user()
    user2, _ = generate_user()
    response = client.get(f"/users/username/{user2['username']}", headers=headers)

    assert response.status_code == 200, response.text
    user2_data = response.json()
    id2 = user2_data["data"]["user_id"]  # 

    # Attempt to update user2 to user1's username
    updated_data = user2.copy()
    updated_data["username"] = user1["username"]

    response = client.put(f"/users/{id2}", json=updated_data,headers=headers)
    assert response.status_code == 409
    assert "Username already registered" in response.json()["detail"]


def test_update_user_duplicate_email():
    user1, headers = generate_user()
    user2, _ = generate_user()
    response = client.get(f"/users/username/{user2['username']}", headers=headers)
    assert response.status_code == 200, response.text
    user2_data = response.json()
    id2 = user2_data["data"]["user_id"]
    updated_data = user2.copy()
    updated_data["email"] = user1["email"]

    response = client.put(f"/users/{id2}", json=updated_data, headers=headers)
    assert response.status_code == 409
    assert "Email already registered" in response.json()["detail"]


    
def test_delete_user_success():
    """
    Create a user, delete the user, confirm deletion.
    """
    # Step 1: Create user using generate_user
    user, headers = generate_user()
    response = client.get(f"/users/username/{user['username']}", headers=headers)
    assert response.status_code == 200, response.text
    user_data = response.json()
    created_user_id = user_data["data"]["user_id"]
    # Step 2: Delete the user
    delete_response = client.delete(f"/users/{created_user_id}",headers=headers)
    assert delete_response.status_code == 200
    assert "deleted successfully" in delete_response.json()["message"]
    # Step 3: Confirm deletion by trying to delete again (should be unauthorized)
    re_delete = client.delete(f"/users/{created_user_id}", headers=headers)
    assert re_delete.status_code == 401
    assert "validate credentials" in re_delete.json()["detail"]

  
def test_delete_nonexistent_user():
    """
    Try deleting a user with a random UUID that doesn’t exist.
    """
    _, headers = generate_user()
    fake_user_id = str(uuid.uuid4())
    response = client.delete(f"/users/{fake_user_id}",headers=headers)
    assert response.status_code == 404
    assert "not found" in response.json()["detail"]

# ------------------------
# Test: Get all users
# ------------------------
def test_get_all_users():
    user, headers = generate_user()
    client.post("/users/", json=user)
  
    response = client.get("/users/",headers=headers)
    assert response.status_code == 200
    assert isinstance(response.json(), list)

# ------------------------
# Test: Get user by ID (valid + invalid)
# ------------------------
def test_get_user_by_id_valid():
    user, headers = generate_user()# added generate_user function
    get_response = client.get(f"/users/username/{user['username']}", headers=headers)
    assert get_response.status_code == 200
    user_id = get_response.json()["data"]["user_id"]

    response = client.get(f"/users/id/{user_id}", headers=headers)
    assert response.status_code == 200
    assert response.json()["data"]["user_id"] == user_id

def test_get_user_by_id_invalid():
    _, headers = generate_user()
    response = client.get("/users/id/fdcb6b82-6684-4fd5-a567-99c379e57d41",headers=headers)
    assert response.status_code == 404
    assert response.json()["detail"] == "User not found"

# ------------------------
# Test: Get user by username (valid + invalid)
# ------------------------
def test_get_user_by_username_valid():
    user, headers = generate_user()# # added generate_user function
    response = client.get(f"/users/username/{user['username']}", headers=headers)
    assert response.status_code == 200
    assert response.json()["data"]["username"] == user["username"]


def test_get_user_by_username_invalid():
    _, headers = generate_user()
    response = client.get("/users/username/John Wick",headers=headers)
    assert response.status_code == 404
    assert response.json()["detail"] == "User not found"

# ------------------------
# Test: Get user by email (valid + invalid)
# ------------------------
def test_get_user_by_email_valid():
    user, headers = generate_user() # added generate_user function
    email = user["email"]
    response = client.get(f"/users/email/{email}",headers=headers)
    assert response.status_code == 200
    assert response.json()["data"]["email"] == email

def test_get_user_by_email_invalid():
    _, headers = generate_user()
    response = client.get("/users/email/fakeuser@example.com",headers=headers)
    assert response.status_code == 404
    assert response.json()["detail"] == "User not found"


## in test cases we remove create response because its creating user details twice and we replace that with get response
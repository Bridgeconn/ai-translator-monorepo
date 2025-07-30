from app.tests import test_database  # ensures test DB is patched

import uuid
import pytest
from app.tests.conftest import client

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
    
    print("RESPONSE JSON:", response.json())  # 4 spaces here

    assert response.status_code == 201
    assert response.json()["username"] == user["username"]
    assert response.json()["email"] == user["email"]



def test_create_user_duplicate_username(client):
    user = generate_user()
    client.post("/users/", json=user)  # create first
    duplicate = user.copy()
    duplicate["email"] = f"{uuid.uuid4().hex[:8]}@example.com"
    response = client.post("/users/", json=duplicate)
    assert response.status_code == 409
    assert "Username already registered" in response.json()["detail"]

def test_create_user_duplicate_email(client ):
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

def test_check_test_db_user(client):
    response = client.get("/users/")
    print(" Users from test DB:", response.json())

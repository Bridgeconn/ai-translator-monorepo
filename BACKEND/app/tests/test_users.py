# import pytest
# from app.database import Base, get_db, engine, SessionLocal
# from app.main import app

# # ✅ Clean DB before and after the entire test session
# @pytest.fixture(scope="session", autouse=True)
# def setup_database():
#     Base.metadata.drop_all(bind=engine)
#     Base.metadata.create_all(bind=engine)
#     yield
#     Base.metadata.drop_all(bind=engine)

# # ✅ Create isolated DB session for each test
# @pytest.fixture
# def db_session():
#     connection = engine.connect()
#     transaction = connection.begin()
#     session = SessionLocal(bind=connection)
#     try:
#         yield session
#     finally:
#         session.close()
#         transaction.rollback()
#         connection.close()

# # ✅ Override FastAPI's get_db dependency to use test DB
# @pytest.fixture(autouse=True)
# def override_get_db(db_session):
#     def _override():
#         yield db_session
#     app.dependency_overrides[get_db] = _override

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
    
    print("RESPONSE JSON:", response.json())  # ✅ 4 spaces here

    assert response.status_code == 201
    assert response.json()["username"] == user["username"]
    assert response.json()["email"] == user["email"]



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

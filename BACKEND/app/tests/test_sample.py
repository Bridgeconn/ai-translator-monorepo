import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.database import Base, get_db
from app.schemas.users import UserCreate
import uuid
import os

# Use a test database (set this in your .env or hardcode for local tests)
TEST_DATABASE_URL = os.getenv("TEST_DATABASE_URL", "postgresql://user:pass@localhost:5432/test_db")

# Setup the engine and session for test DB
engine = create_engine(TEST_DATABASE_URL)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Override the get_db dependency to use test DB
def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

# Apply the override
app.dependency_overrides[get_db] = override_get_db

# Create tables before running tests
@pytest.fixture(scope="session", autouse=True)
def setup_database():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

client = TestClient(app)

def generate_user_data():
    return {
        "username": f"user_{uuid.uuid4().hex[:6]}",
        "email": f"{uuid.uuid4().hex[:6]}@example.com",
        "password": "StrongP@ssword123",
        "full_name": "Test User",
        "role": "user"
    }

def test_create_user_success():
    user_data = generate_user_data()
    response = client.post("/api/v1/users/", json=user_data)
    assert response.status_code == 201
    assert response.json()["message"] == "User created successfully."

def test_duplicate_user():
    user_data = generate_user_data()
    client.post("/api/v1/users/", json=user_data)  # Create first time
    response = client.post("/api/v1/users/", json=user_data)  # Duplicate
    assert response.status_code == 409
    assert "already registered" in response.json()["detail"]


# TODO: Add more tests and include additional tests
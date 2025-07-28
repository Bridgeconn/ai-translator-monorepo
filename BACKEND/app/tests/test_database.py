# app/tests/test_database.py
import os
import pytest
import urllib.parse
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.database import Base
from dotenv import load_dotenv
from pathlib import Path

# ✅ Load .env.test
load_dotenv(dotenv_path=Path(__file__).resolve().parents[2] / ".env.test")

# ✅ Use the POSTGRES_* variables (match .env.test)
DATABASE_USER = os.getenv("POSTGRES_USER")
DATABASE_PASSWORD = os.getenv("POSTGRES_PASSWORD")
DATABASE_HOST = os.getenv("POSTGRES_HOST")
DATABASE_PORT = os.getenv("POSTGRES_PORT")
DATABASE_DB = os.getenv("POSTGRES_DB")

TEST_DATABASE_URL = (
    f"postgresql+psycopg2://{DATABASE_USER}:{urllib.parse.quote(DATABASE_PASSWORD)}"
    f"@{DATABASE_HOST}:{DATABASE_PORT}/{DATABASE_DB}"
)

# ✅ Create test engine
TestEngine = create_engine(TEST_DATABASE_URL)
TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=TestEngine)

# ✅ Drop/create tables for test DB
@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    print("Using test DB:", TEST_DATABASE_URL)
    Base.metadata.drop_all(bind=TestEngine)
    Base.metadata.create_all(bind=TestEngine)
    yield
    Base.metadata.drop_all(bind=TestEngine)

# ✅ Patch SessionLocal in app.database
@pytest.fixture(scope="session", autouse=True)
def patch_sessionlocal():
    import app.database
    app.database.SessionLocal = TestSessionLocal
    yield

# ✅ Provide test DB session for each test
@pytest.fixture
def db_session():
    connection = TestEngine.connect()
    transaction = connection.begin()
    session = TestSessionLocal(bind=connection)
    try:
        yield session
    finally:
        session.close()
        transaction.rollback()
        connection.close()

# ✅ Override get_db in FastAPI app
@pytest.fixture(autouse=True)
def override_get_db(db_session):
    def _override():
        yield db_session
    from app.database import get_db
    app.dependency_overrides[get_db] = _override

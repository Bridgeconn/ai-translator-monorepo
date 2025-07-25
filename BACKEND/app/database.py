from sqlalchemy import create_engine, MetaData, inspect

from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session

from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.schema import CreateSchema
from dotenv import load_dotenv
import urllib
import os

# --- Load environment variables ---
load_dotenv()

POSTGRES_HOST = os.getenv("POSTGRES_HOST")
POSTGRES_PORT = os.getenv("POSTGRES_PORT")
POSTGRES_USER = os.getenv("POSTGRES_USER")
POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD")
POSTGRES_DB = os.getenv("POSTGRES_DB")
POSTGRES_SCHEMA = os.getenv("POSTGRES_SCHEMA")

# Check for missing env vars
if not all([POSTGRES_HOST, POSTGRES_PORT, POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB, POSTGRES_SCHEMA]):
    raise ValueError("One or more required environment variables are missing.")

DATABASE_URL = (
    f"postgresql+psycopg2://{POSTGRES_USER}:{urllib.parse.quote(POSTGRES_PASSWORD)}"
    f"@{POSTGRES_HOST}:{POSTGRES_PORT}/{POSTGRES_DB}"
)

# --- SQLAlchemy engine and session setup ---
engine = create_engine(DATABASE_URL, pool_size=10, max_overflow=20)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

metadata = MetaData(schema=POSTGRES_SCHEMA)
Base = declarative_base(metadata=metadata)

# --- DB inspector ---
inspector = inspect(engine)

# --- Schema creation (called from main.py on startup) ---
def init_db_schema():
    with engine.connect() as connection:
        if not connection.dialect.has_schema(connection, POSTGRES_SCHEMA):
            connection.execute(CreateSchema(POSTGRES_SCHEMA))
            connection.commit()

# --- Dependency for DB session ---
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
import os
import urllib
from dotenv import load_dotenv
from sqlalchemy import create_engine, MetaData, inspect
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.schema import CreateSchema

load_dotenv()

POSTGRES_HOST = os.getenv("POSTGRES_HOST")
POSTGRES_PORT = os.getenv("POSTGRES_PORT")
POSTGRES_USER = os.getenv("POSTGRES_USER")
POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD")
POSTGRES_DB = os.getenv("POSTGRES_DB")
POSTGRES_SCHEMA = os.getenv("POSTGRES_SCHEMA")

DATABASE_URL = (
    f"postgresql+psycopg2://{POSTGRES_USER}:{urllib.parse.quote(POSTGRES_PASSWORD)}"
    f"@{POSTGRES_HOST}:{POSTGRES_PORT}/{POSTGRES_DB}"
)

engine = create_engine(DATABASE_URL, pool_size=10, max_overflow=20)

# Ensure schema exists
with engine.connect() as connection:
    if not connection.dialect.has_schema(connection, POSTGRES_SCHEMA):
        connection.execute(CreateSchema(POSTGRES_SCHEMA))
        connection.commit()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

<<<<<<< HEAD
Base = declarative_base(metadata=MetaData(schema=POSTGRES_SCHEMA))
inspector = inspect(engine)
print("✅ Connecting to DB:", DATABASE_URL)

# ✅ This is the missing part that your route depends on
def get_db():
    db: Session = SessionLocal()
=======
Base = declarative_base()
Base.metadata = MetaData(schema=POSTGRES_SCHEMA)
inspector = inspect(engine)


# --- Dependency to get DB session ---
def get_db():
    db = SessionLocal()
>>>>>>> 3e66df980586e26fb95e575ed6accb2aca3ae0e7
    try:
        yield db
    finally:
        db.close()

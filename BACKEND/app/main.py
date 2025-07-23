from fastapi import Depends, FastAPI
from sqlalchemy.orm import Session
from app.database import SessionLocal, engine
from app.models import users
from sqlalchemy import text


# --- Create tables ---
users.Base.metadata.create_all(bind=engine)

# --- Initialize FastAPI app ---
app = FastAPI(
    title="AI Bible Translator Backend",
    version="1.0.0",
    description="Backend service for managing Bible translation tasks."
)

# --- Dependency to get DB session ---
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- Optional: Root route for confirmation ---
@app.get("/")
def read_root():
    return {"message": "Welcome to the AI Bible Translator backend!"}

# --- Optional: Sample route to verify DB connection ---
@app.get("/ping-db")
def ping_db(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))  # correct way
        return {"status": "Database connection successful!"}
    except Exception as e:
        return {"status": "Database connection failed", "error": str(e)}

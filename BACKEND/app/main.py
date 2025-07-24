from fastapi import Depends, FastAPI
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.database import SessionLocal, engine, Base
from app.routes import users as user_routes  # rename to avoid conflict
from app import models  # this will import and register all models


# --- Create database tables ---
Base.metadata.create_all(bind=engine)
# --- Initialize FastAPI app ---
app = FastAPI(
    title="AI Bible Translator Backend",
    version="1.0.0",
    description="Backend service for managing Bible translation tasks."
)

# --- Include routers ---
app.include_router(user_routes.router)

# --- Dependency to get DB session ---
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- Optional: Root route ---
@app.get("/")
def read_root():
    return {"message": "Welcome to the AI Bible Translator backend!"}

# --- Optional: Ping DB ---
@app.get("/ping-db")
def ping_db(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        return {"status": "Database connection successful!"}
    except Exception as e:
        return {"status": "Database connection failed", "error": str(e)}

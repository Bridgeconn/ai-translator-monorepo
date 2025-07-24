from fastapi import Depends, FastAPI
from sqlalchemy.orm import Session
from app.database import SessionLocal, engine
from app.routes.users import router as users_router
from app.models import users,languages_model
from sqlalchemy import text
from app.database import get_db



# --- Create tables ---
users.Base.metadata.create_all(bind=engine)

# --- Initialize FastAPI app ---
app = FastAPI(
    title="AI Bible Translator Backend",
    version="1.0.0",
    description="Backend service for managing Bible translation tasks."
)



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
  
app.include_router(users_router, prefix="/users", tags=["users"])

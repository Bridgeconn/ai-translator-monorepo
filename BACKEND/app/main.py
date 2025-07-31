from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session
from app.database import SessionLocal
from sqlalchemy import text
from app.routes import users as user_routes # rename to avoid conflict
from app.routes import sources as source_routes
from app.database import get_db, init_db_schema, Base, engine
from contextlib import asynccontextmanager
import logging
from app.utils.seed_bible_books_details import seed_bible_books_details
from app.routes import books


# --- Logger setup ---
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --- Lifespan context for startup/shutdown tasks ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: init schema + tables
    init_db_schema()
    Base.metadata.create_all(bind=engine)
    logger.info("✅ Database schema and tables initialized.")

    # Seed the bible_books_details table only if it's empty

    with SessionLocal() as db:
        seed_bible_books_details(db)

    yield
    logger.info("Application shutdown completed.")


# --- Initialize FastAPI app ---
app = FastAPI(
    title="AI Bible Translator Backend",
    version="1.0.0",
    description="Backend service for managing Bible translation tasks.",
    lifespan=lifespan,
)

@app.get("/", summary="Root Endpoint")
def read_root():
    return {"message": "Welcome to the AI Bible Translator backend!"}

# --- DB Ping Route ---
@app.get("/ping-db", summary="Ping DB Connection")
def ping_db(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        return {"status": "Database connection successful!"}
    except Exception as e:
        return {"status": "Database connection failed", "error": str(e)}
    

# --- Include API Routers ---
app.include_router(user_routes.router, prefix="/users", tags=["users"])
app.include_router(source_routes.router, prefix="/sources", tags=["sources"])
app.include_router(books.router, prefix="/books", tags=["Books"])

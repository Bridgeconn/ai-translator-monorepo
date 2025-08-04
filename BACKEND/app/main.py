from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session
from app.routes import project 

from app.database import SessionLocal
from sqlalchemy import text
from app.routes import users as user_routes, languages
from app import models 
from app.database import get_db, init_db_schema, Base, engine,SessionLocal
from contextlib import asynccontextmanager
import logging
from app.routes import auth
from app.load_language_data import load_languages_from_csv
from app.routes import sources as source_routes
from app.utils.seed_bible_books_details import seed_bible_books_details
from app.routes import books



# --- Create database tables ---
Base.metadata.create_all(bind=engine)



# --- Logger setup ---
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --- Lifespan context for startup/shutdown tasks ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: init schema + tables
    init_db_schema()
    Base.metadata.create_all(bind=engine)
    logger.info(" Database schema and tables initialized.")

    # Load languages AFTER tables are created
    load_languages_from_csv()
    logger.info("Languages loaded from CSV.")
    logger.info("✅ Database schema and tables initialized.")

    # Seed the bible_books_details table only if it's empty

    with SessionLocal() as db:
        seed_bible_books_details(db)

    yield
    logger.info("Application shutdown completed.")


    yield
    # Shutdown: you can add cleanup here if needed
    logger.info("Application shutdown completed.")

# --- Initialize FastAPI app ---
app = FastAPI(
    title="AI Bible Translator Backend",
    version="1.0.0",
    description="Backend service for managing Bible translation tasks.",
    lifespan=lifespan,
)


# --- Dependency to get DB session ---
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

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
app.include_router(user_routes.router, prefix="/users", tags=["Users"])

app.include_router(auth.router, prefix="/auth", tags=["Auth"])

# --- Include Languages Router ---
app.include_router(languages.router, prefix="/languages", tags=["languages"])
app.include_router(source_routes.router, prefix="/sources", tags=["sources"])
app.include_router(books.router, prefix="/books", tags=["Books"])

# --- Include Projects Router ---
app.include_router(project.router, prefix="/projects", tags=["Projects"])

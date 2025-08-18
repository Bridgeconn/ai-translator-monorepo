from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.routes import users as user_routes, languages,sources as source_routes,\
 versions as version_routes, auth,books as book_routes , project as project_routes,\
 word_token_translation, word_tokens,verse_tokens
from app.database import get_db, init_db_schema, Base, engine
from contextlib import asynccontextmanager
import logging
from app.load_language_data import load_languages_from_csv
from app.utils.seed_bible_books_details import seed_book_details


# --- Logger setup ---
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --- Lifespan context for startup/shutdown tasks ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: init schema + tables
    init_db_schema()
    Base.metadata.create_all(bind=engine)
    logger.info("Database schema and tables initialized.")

    # Seed book details
    seed_book_details()

    # Load languages AFTER tables are created
    load_languages_from_csv()

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
app.include_router(version_routes.router, prefix="/versions", tags=["versions"])
app.include_router(auth.router, prefix="/auth", tags=["Auth"])
app.include_router(languages.router, prefix="/languages", tags=["languages"])
app.include_router(source_routes.router, prefix="/sources", tags=["sources"])
app.include_router(book_routes.router, prefix="/books", tags=["Books"]) 
app.include_router(project_routes.router, prefix="/projects", tags=["Projects"])
app.include_router(word_tokens.router, prefix="/word_tokens", tags=["Word Tokens"])
app.include_router(word_token_translation.router, prefix="/api", tags=["Word Token Translation"])
app.include_router(verse_tokens.router, prefix="/verse_tokens", tags=["Verse Tokens"])

from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.routes import users as user_routes  # rename to avoid conflict
from app.database import get_db, init_db_schema, Base, engine
from contextlib import asynccontextmanager
import logging
from app.routes import auth
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

app.include_router(auth.router)

from fastapi import APIRouter, Depends, HTTPException
from app.database import get_db
from sqlalchemy.orm import Session
from uuid import UUID
from app.crud.verse_tokens import create_verse_tokens_for_project
from app.schemas.project import SuccessResponse
from app.models.verse_tokens import VerseTokenTranslation
from app.schemas.verse_tokens import VerseTokenTranslationResponse, MessageOnlyResponse
from typing import List, Optional
from app.crud.verse_tokens import get_verse_token_by_verse_id, get_verse_tokens_by_project


router = APIRouter()

@router.post(
    "/generate-verse-tokens/{project_id}",
    response_model=MessageOnlyResponse   
)
def generate_verse_tokens(project_id: UUID, book_name: str, db: Session = Depends(get_db)):
    try:
        tokens = create_verse_tokens_for_project(db, project_id,book_name)
        return {
        "message": f"{len(tokens)} verse tokens created successfully."
        }
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    

@router.get("/by-project/{project_id}", response_model=List[VerseTokenTranslationResponse])
def get_tokens_by_project(project_id: UUID, book_name: Optional[str] = None, db: Session = Depends(get_db)):
    token = get_verse_tokens_by_project(db, project_id, book_name)
    
    if not token:
        raise HTTPException(status_code=404, detail="No verse tokens found for this project.")
    
    return token

@router.get("/by-id/{verse_token_id}")
def get_verse_token(verse_token_id: UUID, db: Session = Depends(get_db)):
    token = get_verse_token_by_verse_id(db, verse_token_id)
    return {"message": "Verse token retrieved successfully.", "data": token}


from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from uuid import UUID
from typing import List
from app.crud import word_token_translation as crud
from app.database import get_db
from app.schemas.word_token_translation import WordTokenTranslationRequest, WordTokenOut,WordTokenUpdate
from fastapi.responses import StreamingResponse
router = APIRouter()

@router.put("/{word_token_id}", response_model=WordTokenOut)
def update_token(word_token_id: UUID, update: WordTokenUpdate, db: Session = Depends(get_db)):
    updated = crud.update_translation(db, word_token_id, update)
    if not updated:
        raise HTTPException(status_code=404, detail="Token not found")
    return updated

@router.post("/translate", response_model=WordTokenOut)
def translate_word_token(data: WordTokenTranslationRequest, db: Session = Depends(get_db)):
    """
    Translate a word token using Vachan AI and return the result.
    """
    return crud.translate_and_store_word_token(db, data)
@router.post("/generate_batch/{project_id}", response_model=List[WordTokenOut])
def generate_batch(
    project_id: UUID,
    book_id: UUID = Query(..., description="Book ID for which to translate tokens"),
         model_name: str = Query("nllb-600M", description="Translation model to use"),
    db: Session = Depends(get_db)
):
    print(">>> Entered generate_batch route")
    print("Project ID:", project_id)
    print("Book ID:", book_id) # ✅ Log book_id
    print("Model Name:", model_name)
    
    try:
        tokens = crud.generate_tokens_batch(db, project_id, book_id, model_name=model_name)
        print("Tokens returned from CRUD:", len(tokens) if tokens else 0)

        if not tokens:
            raise HTTPException(status_code=404, detail="No tokens found for this project/book")

        return tokens

    except HTTPException:
        raise  # Pass through 404 or 502 raised in CRUD

    except Exception as e:
        print("Unexpected error in generate_batch:", str(e))
        raise HTTPException(status_code=500, detail="Unexpected server error")

@router.get("/generate_batch_stream/{project_id}")
def generate_batch_stream(
    project_id: UUID,
    book_id: UUID = Query(...),
    model_name: str = Query("nllb-600M"),
    full_regenerate: bool = Query(False),
    db: Session = Depends(get_db)
):
    """
    Stream translations batch by batch for a project + book.
    """
    return StreamingResponse(
        crud.generate_tokens_batch_stream(
            db=db,
            project_id=project_id,
            book_id=book_id,
            model_name=model_name,
            full_regenerate=full_regenerate,
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Transfer-Encoding": "chunked"
        }
    )

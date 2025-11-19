from fastapi import APIRouter, Depends, HTTPException,Body
from app.database import get_db
from sqlalchemy.orm import Session
from uuid import UUID
from typing import List, Optional
from sqlalchemy import or_
# CRUD imports
from app.crud import verse_tokens as verse_token_crud

# Models & Schemas
from app.models.verse_tokens import VerseTokenTranslation
from app.models.verse import Verse
from app.models.project import Project
from app.models.chapter import Chapter
from app.models.book import Book

from app.schemas.verse_tokens import (
    TranslateChapterRequest,
    VerseTokenTranslationResponse,
    ManualTranslationUpdate,
    MessageOnlyResponse,
)

router = APIRouter()

# ------------------------------
# Token Generation
# ------------------------------
@router.post(
    "/generate-verse-tokens/{project_id}",
    response_model=MessageOnlyResponse
)
def generate_verse_tokens(
    project_id: UUID,
    book_name: str,
    db: Session = Depends(get_db)
):
    """
    Generate verse tokens for a project.
    - If `book_name` is provided → generate only for that book.
    - If not → generate for all books in the project.
    """
    try:
        tokens = verse_token_crud.create_verse_tokens_for_project(db, project_id, book_name)
        return {"message": f"{len(tokens)} verse tokens created successfully."}
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ------------------------------
# Get Tokens
# ------------------------------
@router.get(
    "/by-project/{project_id}",
    response_model=List[VerseTokenTranslationResponse]
)
def get_tokens_by_project(
    project_id: UUID,
    book_name: str,
    db: Session = Depends(get_db)
):
    tokens = verse_token_crud.get_verse_tokens_by_project(db, project_id, book_name)
    if not tokens:
        raise HTTPException(status_code=404, detail="No verse tokens found for this project.")
    return tokens


@router.get("/by-id/{verse_token_id}")
def get_verse_token(
    verse_token_id: UUID,
    project_id: UUID,                  # ✅ require project_id
    db: Session = Depends(get_db)
):
    token = verse_token_crud.get_verse_token_by_id(db, verse_token_id, project_id)
    return {
        "message": "Verse token retrieved successfully.",
        "data": token
    }

# ------------------------------
# Translation (Vachan AI)
# ------------------------------
@router.post(
    "/translate-verse-token/{verse_token_id}",
    response_model=VerseTokenTranslationResponse
)
def translate_single_token(
    verse_token_id: UUID,
    db: Session = Depends(get_db)
):
    """
    Translate a single verse token using Vachan AI.
    """
    token_obj = verse_token_crud.translate_verse_token(db, verse_token_id)
    return token_obj


# ------------------------------
# Manual Translation Update
# ------------------------------

@router.patch("/manual-update/{verse_token_id}")
def manual_update_translation_route(
    verse_token_id: UUID,
    update: ManualTranslationUpdate,
    project_id: UUID,                 # ✅ require project_id
    db: Session = Depends(get_db)
):
    updated_token = verse_token_crud.manual_update_translation(
        db, verse_token_id, project_id, update.translated_text
    )
    return {"message": "Translation updated successfully", "data": updated_token}
# # Book

@router.post(
    "/translate-chunk/{project_id}/{book_name}",
    response_model=List[VerseTokenTranslationResponse]
)
def translate_chunk_route(
    project_id: UUID,
    book_name: str,
    skip: int = 0,
    limit: int = 10,
    db: Session = Depends(get_db)
):
    """
    Translate a chunk of verses (default 10) from a book.
    - skip → how many verses to skip
    - limit → how many verses to translate this call
    """
    return verse_token_crud.translate_chunk(db, project_id, book_name, skip=skip, limit=limit)

# chapter
from fastapi import Request

@router.post(
    "/translate-chapter/{project_id}/{book_name}/{chapter_number}",
    response_model=List[VerseTokenTranslationResponse]
)
async def translate_chapter_route(
    project_id: UUID,
    book_name: str,
    chapter_number: int,
    request: Request,                                # ✅ Add Request first (non-default)
    request_body: TranslateChapterRequest = Body(...),  # your existing request body
    db: Session = Depends(get_db),                   # your DB session
): 
    print("Received verse_numbers:", request_body.verse_numbers)
    print("Received full_regenerate:", request_body.full_regenerate)  # Add logging
    return await verse_token_crud.translate_chapter(
        db,
        project_id,
        book_name,
        chapter_number,
        request_body.verse_numbers,
        model_name=request_body.model_name,
        request=request,  #  pass it down to the CRUD function
        full_regenerate=request_body.full_regenerate  #  Pass this parameter
    )

# @router.get("/verse_tokens/verse-numbers/{project_id}/{book_name}/{chapter_number}")
# def get_verse_numbers(project_id: UUID, book_name: str, chapter_number: int, db: Session = Depends(get_db)):
#     verses = (
#         db.query(Verse.verse_number)
#         .join(VerseTokenTranslation, Verse.verse_id == VerseTokenTranslation.verse_id)
#         .join(Chapter, Chapter.chapter_id == Verse.chapter_id)
#         .join(Book, Book.book_id == Chapter.book_id)
#         .filter(
#             VerseTokenTranslation.project_id == project_id,
#             Book.book_name == book_name,
#             Chapter.chapter_number == chapter_number,
#             or_ (
#             VerseTokenTranslation.verse_translated_text == None,
#             VerseTokenTranslation.verse_translated_text == ""
#              ),
#             VerseTokenTranslation.is_reviewed == False  # ✅ ADD THIS

#         )
#         .order_by(Verse.verse_number)
#         .all()
#     )
#     if not verses:
#         raise HTTPException(status_code=404, detail="No verses found for this chapter.")
#     # Get unique, sorted verse numbers excluding the first one
#     verse_numbers = sorted(set(v[0] for v in verses))
#     return verse_numbers

@router.get("/verse_tokens/verse-numbers/{project_id}/{book_name}/{chapter_number}")
def get_verse_numbers(project_id: UUID, book_name: str, chapter_number: int, db: Session = Depends(get_db)):
    """
    Get unique verse numbers that need translation.
    """
    
    # ✅ Get unique verses by verse_number (not verse_id)
    all_verses = (
        db.query(Verse.verse_number)
        .join(Chapter, Chapter.chapter_id == Verse.chapter_id)
        .join(Book, Book.book_id == Chapter.book_id)
        .filter(
            Book.book_name == book_name,
            Chapter.chapter_number == chapter_number
        )
        .distinct(Verse.verse_number)  # ✅ Only unique verse numbers
        .order_by(Verse.verse_number)
        .all()
    )
    
    if not all_verses:
        raise HTTPException(status_code=404, detail="No verses found for this chapter.")
    
    verse_numbers = [v[0] for v in all_verses]
    untranslated_verses = []
    
    for verse_number in verse_numbers:
        # ✅ Check if ANY token for this verse_number has translation
        has_translation = (
            db.query(VerseTokenTranslation)
            .join(Verse, VerseTokenTranslation.verse_id == Verse.verse_id)
            .filter(
                VerseTokenTranslation.project_id == project_id,
                Verse.verse_number == verse_number,
                Verse.chapter_id.in_(
                    db.query(Chapter.chapter_id).filter(
                        Chapter.chapter_number == chapter_number,
                        Chapter.book_id.in_(
                            db.query(Book.book_id).filter(Book.book_name == book_name)
                        )
                    )
                )
            )
            .filter(
                VerseTokenTranslation.verse_translated_text.isnot(None),
                VerseTokenTranslation.verse_translated_text != ""
            )
            .first()
        ) is not None
        
        if not has_translation:
            untranslated_verses.append(verse_number)
    
    return untranslated_verses
@router.delete("/clear-chapter-translations/{project_id}/{book_name}/{chapter_number}")
def clear_chapter_translations(
    project_id: UUID,
    book_name: str,
    chapter_number: int,
    db: Session = Depends(get_db)
):
    """
    Clear all translations for a specific chapter.
    Sets all verse_translated_text to empty string.
    """
    try:
        from datetime import datetime
        
        # Get all tokens for this chapter
        tokens = (
            db.query(VerseTokenTranslation)
            .join(Verse, VerseTokenTranslation.verse_id == Verse.verse_id)
            .join(Chapter, Verse.chapter_id == Chapter.chapter_id)
            .join(Book, Chapter.book_id == Book.book_id)
            .filter(
                VerseTokenTranslation.project_id == project_id,
                Book.book_name == book_name,
                Chapter.chapter_number == chapter_number
            )
            .all()
        )
        
        if not tokens:
            raise HTTPException(status_code=404, detail="No tokens found for this chapter")
        
        # Clear all translations
        cleared_count = 0
        for token in tokens:
            token.verse_translated_text = ""
            token.updated_at = datetime.utcnow()
            cleared_count += 1
        
        db.commit()
        
        return {
            "message": f"Cleared {cleared_count} translations successfully",
            "cleared_count": cleared_count
        }
    
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
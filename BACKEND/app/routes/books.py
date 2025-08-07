from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, status
from sqlalchemy.orm import Session
from uuid import UUID
from app.database import get_db
from app.schemas.books import (
    BookUploadResponse, BookUpdate, BookResponse,
    SuccessResponse, ErrorResponse, UploadSuccessResponse, BookListResponse
)
from app.crud.books import (
    create_book_with_usfm,
    get_all_books,
    get_book_by_id,
    delete_book_by_id,
    update_book_with_detail_sync,
    get_books_by_source,
    get_book_by_source_and_name,
)

router = APIRouter()

@router.post("/upload_books/", response_model=UploadSuccessResponse, status_code=201, responses={400: {"model": ErrorResponse}})
def upload_book(source_id: UUID, file: UploadFile = File(...), db: Session = Depends(get_db)):
    content = file.file.read().decode("utf-8")
    book, chapter_count, verse_count = create_book_with_usfm(db, source_id, content)
    return UploadSuccessResponse(
        message="Book uploaded and parsed successfully.",
        data=BookUploadResponse(
            book_id=book.book_id,
            book_name=book.book_name,
            book_code=book.book_code,
            chapters_created=chapter_count,   # no len()
            verses_created=verse_count 
        )
    )

@router.get("/books", response_model=BookListResponse)
def api_get_all_books(db: Session = Depends(get_db)):
    books = get_all_books(db)
    return BookListResponse(
        message="Fetched all books",
        data=[BookResponse.from_orm(book) for book in books]
    )

@router.get("/{book_id}", response_model=SuccessResponse, responses={404: {"model": ErrorResponse}})
def api_get_book(book_id: UUID, db: Session = Depends(get_db)):
    book = get_book_by_id(book_id, db)
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    return SuccessResponse(message="Book found", data=BookResponse.from_orm(book))

@router.delete("/{book_id}", response_model=SuccessResponse, responses={404: {"model": ErrorResponse}})
def api_delete_book(book_id: UUID, db: Session = Depends(get_db)):
    book = get_book_by_id(book_id, db)
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    delete_book_by_id(book_id, db)
    return SuccessResponse(message="Book deleted successfully", data=BookResponse.from_orm(book))

@router.put("/{book_id}", response_model=SuccessResponse, responses={404: {"model": ErrorResponse}})
def api_update_book_and_detail(book_id: UUID, payload: BookUpdate, db: Session = Depends(get_db)):
    """
    Updates a Book by book_id and synchronizes updates to BookDetail by matching book_code.
    Accepts partial payloads — only provided fields will be updated.
    """
    book = update_book_with_detail_sync(book_id, payload, db)
    if not book:
        raise HTTPException(status_code=404, detail="Book not found or update failed")
    return SuccessResponse(
        message="Book and corresponding BookDetail updated successfully.",
        data=BookResponse.from_orm(book)
    )

@router.get("/by_source/{source_id}")
def api_get_books_by_source(source_id: UUID, db: Session = Depends(get_db)):
    books = get_books_by_source(db, source_id)
    if not books:
        raise HTTPException(status_code=404, detail="No books found for this source_id")
    return {"data": books}

@router.get("/by_source/{source_id}/book_name")
def api_get_book_by_source_and_name(source_id: UUID, name: str, db: Session = Depends(get_db)):
    book = get_book_by_source_and_name(db, source_id, name)
    if not book:
        raise HTTPException(status_code=404, detail="Book not found for given source_id and name")
    return {"data": book}

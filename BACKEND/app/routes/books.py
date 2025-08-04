from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, status
from sqlalchemy.orm import Session
from uuid import UUID, uuid4
from app.database import get_db
from app.models.book import Book
from app.models.chapter import Chapter
from app.models.verse import Verse
from app.models.bible_books_details import BibleBookDetail
from app.schemas.books import BookUploadResponse, BookUpdate, BookResponse, SuccessResponse, ErrorResponse,UploadSuccessResponse,BookListResponse
from app.utils.usfm_parser import fallback_tokenize_usfm
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/upload_books/", response_model=UploadSuccessResponse, status_code=201, responses={400: {"model": ErrorResponse}})
def upload_book(source_id: UUID, file: UploadFile = File(...), db: Session = Depends(get_db)):
    content = file.file.read().decode("utf-8")
    logger.info("📄 File read successfully")

    # Extract book code from \id line
    first_line = content.strip().splitlines()[0]
    if not first_line.startswith("\\id"):
        raise HTTPException(status_code=400, detail="Missing \\id tag")
    book_code = first_line.split(" ")[1]

    # Validate
    existing_book = db.query(Book).filter(Book.source_id == source_id, Book.book_code == book_code).first()
    if existing_book:
        raise HTTPException(status_code=400, detail="Book already exists for the source")

    book_detail = db.query(BibleBookDetail).filter(BibleBookDetail.book_code == book_code).first()
    if not book_detail:
        raise HTTPException(status_code=400, detail="Book code not found in BibleBookDetail")

    # Save book
    book = Book(
        book_id=uuid4(),
        source_id=source_id,
        book_code=book_code,
        book_name=book_detail.book_name,
        book_number=book_detail.book_number,
        testament=book_detail.testament,
        usfm_content=content
    )
    db.add(book)
    db.commit()
    db.refresh(book)

    # Parse tokens
    tokens = fallback_tokenize_usfm(content)
    chapters_created = 0
    verses_created = 0
    chapter_id = None

    for token in tokens:
        if token["type"] == "chapter":
            chapter_id = uuid4()
            chapter = Chapter(
                chapter_id=chapter_id,
                book_id=book.book_id,
                chapter_number=token["number"]
            )
            db.add(chapter)
            chapters_created += 1

        elif token["type"] == "verse" and chapter_id:
            verse = Verse(
                verse_id=uuid4(),
                chapter_id=chapter_id,
                verse_number=token["number"],
                content=token["text"],
                usfm_tags=token["raw"]
            )
            db.add(verse)
            verses_created += 1

    db.commit()

    return UploadSuccessResponse(
    message="Book uploaded and parsed successfully.",
    data=BookUploadResponse(
        book_id=book.book_id,
        book_name=book.book_name,
        book_code=book.book_code,
        chapters_created=chapters_created,
        verses_created=verses_created
    )
)

@router.get("/books", response_model=BookListResponse)
def get_all_books(db: Session = Depends(get_db)):
    books = db.query(Book).all()
    return BookListResponse(
        message="Fetched all books",
        data=[BookResponse.from_orm(book) for book in books]
    )


@router.get("/{book_id}", response_model=SuccessResponse, responses={404: {"model": ErrorResponse}})
def get_book(book_id: UUID, db: Session = Depends(get_db)):
    book = db.query(Book).filter(Book.book_id == book_id).first()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    return SuccessResponse(message="Book found", data=BookResponse.from_orm(book))


@router.delete("/{book_id}", response_model=SuccessResponse, responses={404: {"model": ErrorResponse}})
def delete_book(book_id: UUID, db: Session = Depends(get_db)):
    book = db.query(Book).filter(Book.book_id == book_id).first()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")

    db.query(Verse).filter(Verse.chapter_id.in_(
        db.query(Chapter.chapter_id).filter(Chapter.book_id == book_id)
    )).delete(synchronize_session=False)

    db.query(Chapter).filter(Chapter.book_id == book_id).delete(synchronize_session=False)
    db.delete(book)
    db.commit()
    return SuccessResponse(message="Book deleted successfully", data=BookResponse.from_orm(book))


@router.put("/{book_id}", response_model=SuccessResponse, responses={404: {"model": ErrorResponse}})
def update_book(book_id: UUID, payload: BookUpdate, db: Session = Depends(get_db)):
    book = db.query(Book).filter(Book.book_id == book_id).first()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")

    for field, value in payload.dict(exclude_unset=True).items():
        setattr(book, field, value)

    db.commit()
    db.refresh(book)
    return SuccessResponse(message="Book updated successfully", data=BookResponse.from_orm(book))

# ✅ crud/books.py
from sqlalchemy.orm import Session
from uuid import UUID, uuid4
from app.models.book import Book
from app.utils.usfm_parser import parse_usfm_and_save
from app.models.bible_books_details import BibleBookDetail
from app.schemas.books import BookUpdate
from fastapi import HTTPException
from app.models.chapter import Chapter
from app.models.verse import Verse

def create_book_with_usfm(db: Session, source_id: UUID, usfm_text: str):
    lines = usfm_text.splitlines()
    id_line = next((line for line in lines if line.startswith("\\id")), None)
    if not id_line:
        raise HTTPException(status_code=400, detail="Missing \\id tag")

    book_code = id_line.split(" ")[1].strip()

    existing = db.query(Book).filter(Book.source_id == source_id, Book.book_code == book_code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Book already exists for this source")

    metadata = db.query(BibleBookDetail).filter(BibleBookDetail.book_code == book_code).first()
    if not metadata:
        raise HTTPException(status_code=400, detail=f"No book metadata found for code: {book_code}")

    book = Book(
        book_id=uuid4(),
        source_id=source_id,
        book_code=book_code,
        book_name=metadata.book_name,
        book_number=metadata.book_number,
        testament=metadata.testament,
        usfm_content=usfm_text
    )
    db.add(book)
    db.commit()
    db.refresh(book)

    chapters, verses = parse_usfm_and_save(usfm_text, db, book.book_id)

    return book, chapters, verses

def get_all_books(db: Session):
    return db.query(Book).all()

def get_book_by_id(book_id: UUID, db: Session):
    return db.query(Book).filter(Book.book_id == book_id).first()

def delete_book_by_id(book_id: UUID, db: Session):
    book = db.query(Book).filter(Book.book_id == book_id).first()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")

    db.query(Verse).filter(Verse.chapter_id.in_(
        db.query(Chapter.chapter_id).filter(Chapter.book_id == book_id)
    )).delete(synchronize_session=False)
    db.query(Chapter).filter(Chapter.book_id == book_id).delete(synchronize_session=False)
    db.delete(book)
    db.commit()
    return True

def update_book(book_id: UUID, book_data: BookUpdate, db: Session):
    book = db.query(Book).filter(Book.book_id == book_id).first()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")

    for field, value in book_data.dict(exclude_unset=True).items():
        setattr(book, field, value)

    db.commit()
    db.refresh(book)
    return book

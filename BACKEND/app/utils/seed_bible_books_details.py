import csv
import os
from sqlalchemy.orm import Session
from app.models.bible_books_details import BibleBookDetail

def seed_bible_books_details(db: Session):
    # CSV file path
    file_path = os.path.join(os.path.dirname(__file__), "../data/bible_books_details.csv")
    if not os.path.isfile(file_path):
        print(f" CSV file not found at {file_path}")
        return

    with open(file_path, newline='', encoding='utf-8') as csvfile:
        reader = csv.DictReader(csvfile)
        print("Detected CSV headers:", reader.fieldnames)

        for row in reader:
            book = db.query(BibleBookDetail).filter_by(book_id=int(row["book_id"])).first()
            if book:
                book.chapter_count = int(float(row["chapter_count"])) if row["chapter_count"] else None

            else:
                print(f"Inserting new book_id {row['book_id']}")
                new_book = BibleBookDetail(
                    book_id=int(row["book_id"]),
                    book_name=row["book_name"],
                    book_code=row["book_code"],
                    book_number=int(row["book_number"]),
                    testament=row["testament"],
                    chapter_count = int(float(row["chapter_count"])) if row["chapter_count"] else None
                )
                db.add(new_book)

        db.commit()
        print("✅ Bible books seeded or updated.")

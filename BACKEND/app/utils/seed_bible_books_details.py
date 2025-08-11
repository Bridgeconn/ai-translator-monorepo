import csv
import os
from sqlalchemy.orm import Session
from app.models.books_details import BookDetail

def seed_book_details(db: Session):
    file_path = os.path.join(os.path.dirname(__file__), "../data/bible_books_details.csv")
    if not os.path.isfile(file_path):
        # print(f"CSV file not found at {file_path}")
        return

    with open(file_path, newline='', encoding='utf-8') as csvfile:
        reader = csv.DictReader(csvfile)
        # print("📘 Detected CSV headers:", reader.fieldnames)

        inserted = 0
        for row in reader:
            number = int(row["book_number"])

            existing = db.query(BookDetail).filter_by(book_number=number).first()
            if existing:
                #print(f"⏩ Skipping existing book_number {number} - {row['book_name']}")
                continue

            book = BookDetail(
                book_details_id=int(row["book_id"]),
                book_name=row["book_name"].strip(),
                book_code=row["book_code"].strip(),
                book_number=number,
                testament=row["testament"].strip(),
                chapter_count=int(float(row["chapter_count"])),
                is_active=True
            )
            db.add(book)
            inserted += 1

        db.commit()
        # print(f"✅ Done. Inserted {inserted} new books.")

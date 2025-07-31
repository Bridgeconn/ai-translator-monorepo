import csv
import os
from sqlalchemy.orm import Session
from app.models.bible_books_details import BibleBookDetail

def seed_bible_books_details(db: Session):
    # Check if all 66 books already exist
    existing_count = db.query(BibleBookDetail).count()
    if existing_count >= 66:
        print("✅ All bible_books_details already seeded.")
        return

    # CSV file path
    file_path = os.path.join(os.path.dirname(__file__), "../data/bible_books_details.csv")
    if not os.path.isfile(file_path):
        print(f"❌ CSV file not found at {file_path}")
        return

    # Read and seed
    with open(file_path, newline='', encoding='utf-8') as csvfile:
        reader = csv.DictReader(csvfile)
        books = [
            BibleBookDetail(
                book_id=int(row["book_id"]),
                book_name=row["book_name"],
                book_code=row["book_code"],
                book_number=int(row["book_number"]),
                testament=row["testament"]
            )
            for row in reader
        ]
        db.bulk_save_objects(books)
        db.commit()
        print(f"✅ Seeded {len(books)} bible books.")

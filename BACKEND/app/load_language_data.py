import csv
import os
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models.languages import Language

def load_languages_from_csv():
    db: Session = SessionLocal()
    try:
        if db.query(Language).first():
            # print("Languages already loaded. Skipping.")
            return  # Skip if data exists

        file_path = os.path.join("docs", "languages.csv")
        if not os.path.exists(file_path):
            # print(f"CSV file not found: {file_path}")
            return

        with open(file_path, newline='', encoding='utf-8') as csvfile:
            reader = csv.DictReader(csvfile)
            for row in reader:
                language = Language(
                    name=row['language'].strip(),
                    BCP_code=row['BCP-47 code'].strip(),
                    ISO_code=row['ISO 639-3 code'].strip()
                )
                db.add(language)

        db.commit()
        # print("Languages imported successfully.")

    except Exception as e:
        # print("Error loading languages:", e)
        db.rollback()
    finally:
        db.close()

from sqlalchemy import create_engine, text
from dotenv import load_dotenv
import os

load_dotenv(".env.test")

DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)

def test_connection():
    try:
        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1;"))
            print("Connected to test_db:", result.scalar())
    except Exception as e:
        print(" Failed to connect:", e)

if __name__ == "__main__":
    test_connection()

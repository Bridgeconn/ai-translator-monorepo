from usfm_grammar import USFMParser, Filter
from app.models.chapter import Chapter
from app.models.verse import Verse
from sqlalchemy.orm import Session
from uuid import uuid4
from datetime import datetime
from typing import Tuple, List, Dict, Optional
import logging

logger = logging.getLogger(__name__)

def parse_usfm_and_save(usfm_text: str, db: Session, book_id) -> Tuple[int, int]:
    try:
        parser = USFMParser(usfm_text)
        book_data = parser.to_usj(include_markers=Filter.BCV + Filter.TEXT,
        ignore_errors=True)
        content = book_data.get("content", [])
    except Exception as e:
        logger.error("USFMParser failed to parse USFM text: %s", e)
        raise

    chapter_id = None
    chapter_count = 0
    verse_count = 0
    current_chapter_number = None

    for i, item in enumerate(content):
        if isinstance(item, dict):
            if item.get("type") == "chapter":
                current_chapter_number = int(item.get("number"))
                chapter_id = uuid4()
                chapter = Chapter(
                    chapter_id=chapter_id,
                    book_id=book_id,
                    chapter_number=current_chapter_number,
                    created_at=datetime.utcnow()
                )
                db.add(chapter)
                chapter_count += 1

            elif item.get("type") == "verse":
                verse_number = int(item.get("number"))
                verse_text = ""
                usfm_tag = item.get("marker", "")


                # Check the next item (should be the actual verse content string)
                if i + 1 < len(content) and isinstance(content[i + 1], str):
                    verse_text = content[i + 1].strip()
                
                verse = Verse(
                    verse_id=uuid4(),
                    chapter_id=chapter_id,
                    verse_number=verse_number,
                    content=verse_text,
                    usfm_tags= "\\" + usfm_tag,  # optional, unless needed
                    created_at=datetime.utcnow()
                )
                db.add(verse)
                verse_count += 1

    db.commit()
    return chapter_count, verse_count

# ✅ FILE: app/utils/usfm_parser.py
import re
from typing import List, Dict, Tuple
from uuid import uuid4
from app.models.chapter import Chapter
from app.models.verse import Verse
from sqlalchemy.orm import Session
from datetime import datetime
from usfm_grammar import USFMParser
import logging

logger = logging.getLogger(__name__)


def fallback_tokenize_usfm(usfm_text: str) -> List[Dict]:
    tokens = []
    current_chapter = None
    current_verse = None
    lines = usfm_text.splitlines()

    for line in lines:
        line = line.strip()
        if line.startswith("\\c "):
            current_chapter = int(line[3:].strip())
            tokens.append({"type": "chapter", "number": current_chapter})

        elif line.startswith("\\v "):
            parts = line.split(" ", 2)
            if len(parts) >= 3:
                current_verse = int(parts[1])
                verse_text = parts[2]
                tokens.append({
                    "type": "verse",
                    "number": current_verse,
                    "text": verse_text,
                    "raw": line
                })

        elif line.startswith("\\q") and current_verse is not None:
            additional_text = re.sub(r"\\q\\d*\\s*", "", line).strip()
            if additional_text and tokens:
                tokens[-1]["text"] += " " + additional_text

    return tokens


def parse_usfm_and_save(usfm_text: str, db: Session, book_id) -> Tuple[int, int]:
    parser = USFMParser(usfm_text)
    try:
        raw_tokens = parser.to_list(ignore_errors=True)
        def flatten(tokens):
            for token in tokens:
                if isinstance(token, list):
                    yield from flatten(token)
                else:
                    yield token

        tokens = list(flatten(raw_tokens))
    except Exception as e:
        logger.warning("USFMParser failed. Falling back.")
        tokens = fallback_tokenize_usfm(usfm_text)

    chapter_id = None
    chapter_count = 0
    verse_count = 0

    for token in tokens:
        if not isinstance(token, dict):
            continue
        token_type = token.get("type")
        if token_type == "chapter":
            chapter_id = uuid4()
            chapter = Chapter(
                chapter_id=chapter_id,
                book_id=book_id,
                chapter_number=int(token.get("number", 0)),
                created_at=datetime.utcnow()
            )
            db.add(chapter)
            chapter_count += 1

        elif token_type == "verse" and chapter_id:
            verse = Verse(
                verse_id=uuid4(),
                chapter_id=chapter_id,
                verse_number=int(token.get("number", 0)),
                content=token.get("text", "").strip(),
                usfm_tags=str(token.get("raw", "")),
                created_at=datetime.utcnow()
            )
            db.add(verse)
            verse_count += 1

    db.commit()
    return chapter_count, verse_count

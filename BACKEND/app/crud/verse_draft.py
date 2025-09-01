import re
from sqlalchemy import UUID
from sqlalchemy.orm import Session, joinedload
from app.models.verse import Verse
from app.models.verse_tokens import VerseTokenTranslation
from app.models.translation_draft import TranslationDraft
from app.models.book import Book
from uuid import uuid4
from datetime import datetime
from typing import Dict, List, Tuple, Optional


class TranslationService:
    
    def extract_inline_tags(self, text: str) -> List[Tuple[str, str, str]]:
        """
        Extract inline USFM tags like \nd Lord\nd* from text.
        Returns list of (tag_name, tagged_text, closing_marker)
        """
        tag_pattern = r'\\([a-z]+\d*)([^\\]*?)\\(\1)(\*?)'
        matches = re.findall(tag_pattern, text)
        return [(match[0], match[1].strip(), match[3]) for match in matches]
    
    def apply_tags_to_translation(self, original_text: str, translated_text: str) -> str:
        """
        Apply inline tags from original text to translated text.
        Simple approach: apply first tag to first word of translation.
        """
        tags = self.extract_inline_tags(original_text)
        if not tags:
            return translated_text
            
        # Apply first tag to first meaningful word
        tag_name, original_tagged_word, closing = tags[0]
        words = translated_text.split()
        
        if words:
            # Apply tag to first word
            tagged_word = words[0]
            remaining = ' '.join(words[1:]) if len(words) > 1 else ''
            
            if remaining:
                return f"\\{tag_name}{tagged_word}\\{tag_name}{closing}, {remaining}"
            else:
                return f"\\{tag_name}{tagged_word}\\{tag_name}{closing}"
        
        return translated_text

    def split_text_intelligently(self, text: str, num_parts: int) -> List[str]:
        """Split text into parts based on natural breaks."""
        if num_parts <= 1:
            return [text]
        
        # Try splitting by punctuation first
        parts = re.split(r'[.;:]\s+', text)
        if len(parts) >= num_parts:
            return parts[:num_parts]
        
        # Try splitting by commas
        parts = re.split(r',\s+', text)
        if len(parts) >= num_parts:
            return parts[:num_parts]
        
        # Fallback: split by words evenly
        words = text.split()
        if len(words) <= num_parts:
            return [text]
            
        words_per_part = len(words) // num_parts
        result = []
        
        for i in range(num_parts):
            start_idx = i * words_per_part
            if i == num_parts - 1:  # Last part gets remaining words
                result.append(' '.join(words[start_idx:]))
            else:
                result.append(' '.join(words[start_idx:start_idx + words_per_part]))
        
        return result

    def process_verse_block(self, lines: List[str], start_idx: int) -> Tuple[List[str], int]:
        """
        Process a verse block and return the processed lines and next index.
        """
        verse_lines = []
        text_line_indices = []  # Track which lines contain text
        i = start_idx
        
        # Collect all lines belonging to this verse
        while i < len(lines):
            line = lines[i].strip()
            
            # Stop at next verse, chapter, or major section
            if i > start_idx and (re.match(r'\\v\s+\d+', line) or 
                                  re.match(r'\\c\s+\d+', line) or
                                  re.match(r'\\s\d*\b', line) or
                                  re.match(r'\\p\b', line) or
                                  re.match(r'\\id\b', line)):
                break
            
            verse_lines.append(lines[i])
            
            # Check if this line contains text content
            if self.line_contains_text(line):
                text_line_indices.append(len(verse_lines) - 1)
            
            i += 1
        
        return verse_lines, text_line_indices, i

    def line_contains_text(self, line: str) -> bool:
        """Check if a line contains actual text content (not just markers)."""
        line = line.strip()
        if not line:
            return False
        
        # Remove USFM markers and see if anything remains
        # Remove verse markers
        text = re.sub(r'^\\v\s+\d+\s*', '', line)
        # Remove other markers
        text = re.sub(r'^\\[a-z]+\d*\*?\s*', '', text)
        
        return bool(text.strip())

    def extract_text_from_line(self, line: str) -> str:
        """Extract text content from a line, removing USFM markers."""
        line = line.strip()
        if not line:
            return ""
        
        # Remove verse marker
        text = re.sub(r'^\\v\s+\d+\s*', '', line)
        # Remove other USFM markers
        text = re.sub(r'^\\[a-z]+\d*\*?\s*', '', text)
        
        return text.strip()

    def rebuild_verse_with_translation(self, verse_lines: List[str], 
                                     text_line_indices: List[int], 
                                     translated_text: str) -> List[str]:
        """
        Rebuild verse lines with translated text distributed appropriately.
        """
        if not text_line_indices:
            return verse_lines
        
        # Split translation based on number of text-containing lines
        text_parts = self.split_text_intelligently(translated_text, len(text_line_indices))
        
        result_lines = []
        text_part_idx = 0
        
        for i, line in enumerate(verse_lines):
            if i in text_line_indices and text_part_idx < len(text_parts):
                # This line should contain text
                if i == 0:
                    # First line (verse line) - handle tags
                    verse_match = re.match(r'(\\v\s+\d+)\s*(.*)', line)
                    if verse_match:
                        verse_marker = verse_match.group(1)
                        original_text = verse_match.group(2)
                        
                        # Apply tags from original to translation
                        translated_with_tags = self.apply_tags_to_translation(
                            original_text, text_parts[text_part_idx]
                        )
                        result_lines.append(f"{verse_marker} {translated_with_tags}")
                    else:
                        result_lines.append(f"{line} {text_parts[text_part_idx]}")
                else:
                    # Other text lines - preserve structure
                    marker_match = re.match(r'(\\[a-z]+\d*\*?\s*)', line)
                    if marker_match:
                        marker = marker_match.group(1)
                        result_lines.append(f"{marker}{text_parts[text_part_idx]}")
                    else:
                        result_lines.append(text_parts[text_part_idx])
                
                text_part_idx += 1
            else:
                # This line doesn't contain text or we've run out of parts
                if self.line_contains_text(line):
                    # Remove text content, keep just the marker
                    marker_match = re.match(r'(\\[a-z]+\d*\*?\s*)', line)
                    if marker_match:
                        result_lines.append(marker_match.group(1).rstrip())
                    else:
                        result_lines.append("")  # Empty line
                else:
                    # Keep structural line as is
                    result_lines.append(line)
        
        return result_lines

    def generate_draft_from_verses(self, db: Session, project_id: UUID, book_name: str | None = None):
        """
        Generate a draft by replacing verses in the source USFM
        with translated verses from VerseTokenTranslation for the project.
        """

        # Step 1: Fetch all translated verses for the project
        translated_verses = (
            db.query(VerseTokenTranslation)
            .options(joinedload(VerseTokenTranslation.verse).joinedload(Verse.chapter))
            .filter(VerseTokenTranslation.project_id == project_id)
            .filter(VerseTokenTranslation.is_active == True)
            .all()
        )

        if not translated_verses:
            return None

        # Step 2: Determine the book name
        if not book_name:
            book_name = translated_verses[0].book_name

        # Step 3: Get the source USFM content
        book = db.query(Book).filter(Book.book_name == book_name).first()
        if not book or not book.usfm_content:
            return None

        usfm_content = book.usfm_content

        # Step 4: Build verse mapping
        verse_map = {
            (v.verse.chapter.chapter_number, v.verse.verse_number): v.verse_translated_text
            for v in translated_verses
            if v.verse_translated_text and v.verse is not None and v.verse.chapter is not None
        }

        # Step 5: Process USFM content
        lines = usfm_content.splitlines()
        result_lines = []
        current_chapter = 1
        i = 0

        while i < len(lines):
            line = lines[i].strip()

            # Track chapter changes
            chapter_match = re.match(r'\\c\s+(\d+)', line)
            if chapter_match:
                current_chapter = int(chapter_match.group(1))
                result_lines.append(lines[i])
                i += 1
                continue

            # Process verses
            verse_match = re.match(r'\\v\s+(\d+)', line)
            if verse_match:
                verse_number = int(verse_match.group(1))
                translation_key = (current_chapter, verse_number)
                
                # Process the entire verse block
                verse_lines, text_indices, next_i = self.process_verse_block(lines, i)
                
                if translation_key in verse_map:
                    # Replace with translation
                    translated_text = verse_map[translation_key]
                    new_lines = self.rebuild_verse_with_translation(
                        verse_lines, text_indices, translated_text
                    )
                    result_lines.extend(new_lines)
                else:
                    # Keep original
                    result_lines.extend(verse_lines)
                
                i = next_i
            else:
                # Non-verse line
                result_lines.append(lines[i])
                i += 1

        updated_usfm = "\n".join(result_lines)

        # Step 6: Create draft
        draft = TranslationDraft(
            draft_id=uuid4(),
            project_id=project_id,
            draft_name=f"{book_name}_draft_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}",
            content=updated_usfm,
            format="usfm",
            file_size=len(updated_usfm.encode("utf-8")),
            created_at=datetime.utcnow(),
            download_count=0
        )

        db.add(draft)
        db.commit()
        db.refresh(draft)

        return draft
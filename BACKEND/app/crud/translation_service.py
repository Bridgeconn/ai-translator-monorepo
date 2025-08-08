import re
from datetime import datetime
from typing import Dict, List, Tuple, Optional

from sqlalchemy.orm import Session
from sqlalchemy import text
from fastapi import HTTPException

# Import your models - adjust these imports based on your actual model locations
try:
    from app.models.verse_token_translation import VerseTokenTranslation
    from app.models.project import Project
    from app.models.verse import Verse
    from app.models.translationdraft import TranslationDraft
except ImportError as e:
    print(f"Warning: Could not import models: {e}")


class TranslationService:
    """Service for handling USFM translation and poetry formatting."""

    def create_initial_draft_from_project(self, db: Session, project_id: int):
        """Create initial draft from project's original USFM content"""
        
        # Get the project to access original USFM content
        project = db.query(Project).filter(Project.project_id == project_id).first()
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        # Check if project has original content (adjust field name as needed)
        original_content = None
        if hasattr(project, 'original_content'):
            original_content = project.original_content
        elif hasattr(project, 'usfm_content'):
            original_content = project.usfm_content
        elif hasattr(project, 'content'):
            original_content = project.content
        else:
            # If no content field found, create a basic USFM structure
            original_content = """\\id hab 45HABGNT92.usfm, Good News Translation, June 2003
\\c 3
\\s1 A Prayer of Habakkuk
\\p
\\v 1 This is a prayer of the prophet Habakkuk

\\v 2 Lord, I have heard of what you have done, and I am filled with awe.
"""
        
        if not original_content:
            raise HTTPException(status_code=404, detail="No original content found in project")
        
        # Create initial draft
        initial_draft = TranslationDraft(
            project_id=project_id,
            draft_name=f"initial_draft_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}",
            content=original_content,
            format="usfm",
            file_size=len(original_content.encode("utf-8")),
            download_count=0,
        )
        
        db.add(initial_draft)
        db.commit()
        db.refresh(initial_draft)
        
        return initial_draft

    def smart_text_splitter(self, text: str, target_parts: int) -> List[str]:
        """
        Intelligently split text into the target number of parts using multiple strategies.
        """
        if target_parts <= 1:
            return [text]
        
        # Strategy 1: Split by strong punctuation (periods, semicolons, colons)
        strong_punct = re.finditer(r'[.;:](?=\s)', text)
        strong_points = [m.end() for m in strong_punct]
        
        # Strategy 2: Split by commas as fallback
        comma_points = [m.end() for m in re.finditer(r',(?=\s)', text)]
        
        # Strategy 3: Natural phrase boundaries (conjunctions, relative pronouns)
        phrase_boundaries = [m.start() for m in re.finditer(
            r'\s+(and|but|or|for|yet|so|that|which|who|when|where|while|because|although|unless|until)\s+', 
            text, re.IGNORECASE
        )]
        
        # Choose the best splitting strategy
        split_points = []
        if len(strong_points) >= target_parts - 1:
            split_points = strong_points[:target_parts - 1]
        elif len(comma_points) >= target_parts - 1:
            split_points = comma_points[:target_parts - 1]
        elif len(phrase_boundaries) >= target_parts - 1:
            split_points = phrase_boundaries[:target_parts - 1]
        else:
            # Fallback: split by words
            words = text.split()
            if len(words) > target_parts:
                words_per_part = len(words) // target_parts
                split_points = []
                for i in range(1, target_parts):
                    word_pos = i * words_per_part
                    # Find the position of this word in the original text
                    words_so_far = ' '.join(words[:word_pos])
                    split_points.append(len(words_so_far) + 1)
        
        # Create parts based on split points
        if not split_points:
            return [text]
        
        parts = []
        start = 0
        for point in split_points:
            part = text[start:point].strip()
            if part:
                parts.append(part)
            start = point
        
        remaining = text[start:].strip()
        if remaining:
            parts.append(remaining)
        
        # Clean up empty parts and ensure we don't have too many parts
        parts = [part for part in parts if part]
        
        # If we have too many parts, combine the excess ones
        while len(parts) > target_parts:
            if len(parts) >= 2:
                parts[-2] = f"{parts[-2]} {parts[-1]}"
                parts.pop()
            else:
                break
        
        return parts

    def split_translation_for_poetry(self, translated_text: str, original_content: str) -> str:
        """
        Split the translated text based on the exact structure of the original content.
        Preserves all USFM markers and replaces only the text content.
        """
        
        # Split original content into lines
        lines = original_content.split('\n')
        
        # Analyze the structure to find text content positions
        structure = []
        text_positions = []
        
        for i, line in enumerate(lines):
            line = line.strip()
            if line == '':
                continue
            elif line.startswith('\\'):
                # This is a USFM marker
                structure.append(('marker', line))
            else:
                # This is text content
                structure.append(('text', line))
                text_positions.append(len(structure) - 1)
        
        print(f"  -> Found {len(text_positions)} text sections in original")
        print(f"  -> Structure: {structure}")
        
        # If no text content found or only one, just replace directly
        if len(text_positions) <= 1:
            # Simple replacement - preserve all markers, replace text
            result_lines = []
            text_replaced = False
            
            for item_type, content in structure:
                if item_type == 'marker':
                    result_lines.append(content)
                elif item_type == 'text' and not text_replaced:
                    result_lines.append(translated_text)
                    text_replaced = True
            
            # If no text was found to replace, add the translation at the end
            if not text_replaced:
                result_lines.append(translated_text)
            
            return '\n'.join(result_lines)
        
        # Multiple text sections - need to split the translation
        translated_parts = self.smart_text_splitter(translated_text, len(text_positions))
        
        print(f"  -> Split translation into {len(translated_parts)} parts: {translated_parts}")
        
        # Build the result by replacing text content with translated parts
        result_lines = []
        part_index = 0
        
        for item_type, content in structure:
            if item_type == 'marker':
                result_lines.append(content)
            elif item_type == 'text':
                if part_index < len(translated_parts):
                    result_lines.append(translated_parts[part_index])
                    part_index += 1
                else:
                    # Fallback - use original if we run out of parts
                    result_lines.append(content)
        
        return '\n'.join(result_lines)

    def generate_draft_from_verses(self, db: Session, project_id: int):
        """Generate a new translation draft from verse translations."""
        
        # 1. Get the latest original draft content OR create one if missing
        original_draft_obj = (
            db.query(TranslationDraft)
            .filter(TranslationDraft.project_id == project_id)
            .order_by(TranslationDraft.created_at.desc())
            .first()
        )
        
        if not original_draft_obj or not original_draft_obj.content:
            print("No original draft found, creating initial draft from project...")
            original_draft_obj = self.create_initial_draft_from_project(db, project_id)

        draft = original_draft_obj.content
        print("=== Original USFM Content ===")
        print(repr(draft))
        print("============================")

        # 2. Get verse translations
        verse_translations_query = text("""
            SELECT vtt.verse_translated_text, v.verse_number, c.chapter_number
            FROM verse_token_translation vtt
            JOIN verses v ON vtt.verse_id = v.verse_id
            JOIN chapters c ON v.chapter_id = c.chapter_id
            WHERE vtt.project_id = :project_id 
            AND vtt.is_active = true 
            AND v.is_active = true
            AND vtt.verse_translated_text IS NOT NULL
            AND vtt.verse_translated_text != ''
        """)
        
        result = db.execute(verse_translations_query, {"project_id": project_id})
        verse_data = result.fetchall()

        # 3. Create verse map
        verse_map = {}
        for row in verse_data:
            translated_text, verse_number, chapter_number = row
            key = (chapter_number, verse_number)
            verse_map[key] = translated_text.strip()
            print(f"Verse map: ({chapter_number}, {verse_number}) -> '{translated_text}'")

        print(f"Total verse translations: {len(verse_map)}")

        if not verse_map:
            print("No translations found, returning original draft")
            return original_draft_obj

        # 4. Process USFM line by line to handle complete verse replacement
        lines = draft.split('\n')
        processed_lines = []
        current_chapter = 1
        i = 0
        
        while i < len(lines):
            line = lines[i]
            
            # Track chapter
            chapter_match = re.match(r'\\c\s+(\d+)', line)
            if chapter_match:
                current_chapter = int(chapter_match.group(1))
                processed_lines.append(line)
                i += 1
                continue
            
            # Process verse lines
            verse_match = re.match(r'(\\v\s+)(\d+)\s*(.*)', line)
            if verse_match:
                verse_marker = verse_match.group(1)
                verse_number = int(verse_match.group(2))
                verse_content = verse_match.group(3) if verse_match.group(3) else ""
                
                # Collect all lines that belong to this verse
                verse_lines = []
                if verse_content.strip():
                    verse_lines.append(verse_content)
                
                j = i + 1
                
                # Look ahead to collect all content that belongs to this verse
                while j < len(lines):
                    next_line = lines[j]
                    
                    # Stop if we hit next verse, chapter, or major section
                    if (re.match(r'\\v\s+\d+', next_line) or 
                        re.match(r'\\c\s+\d+', next_line) or
                        re.match(r'\\s\d*', next_line) or
                        re.match(r'\\p\b', next_line)):
                        break
                    
                    # Include everything else as part of this verse
                    verse_lines.append(next_line)
                    j += 1
                
                # Now we have all content for this verse
                original_verse_content = '\n'.join(verse_lines)
                key = (current_chapter, verse_number)
                translated_text = verse_map.get(key)
                
                if translated_text:
                    print(f"\nReplacing verse {current_chapter}:{verse_number}")
                    print(f"  Original verse content:")
                    for idx, vl in enumerate(verse_lines):
                        print(f"    {idx}: '{vl}'")
                    print(f"  Translated text: '{translated_text}'")
                    
                    # Apply poetry formatting based on original structure
                    formatted_translation = self.split_translation_for_poetry(translated_text, original_verse_content)
                    
                    print(f"  -> Formatted result: '{formatted_translation}'")
                    
                    # Add the formatted verse
                    processed_lines.append(f"{verse_marker}{verse_number} {formatted_translation}")
                    
                    # Skip all the original verse lines we just processed
                    i = j
                else:
                    print(f"No translation for verse {current_chapter}:{verse_number}, keeping original")
                    # Keep original verse and all its lines
                    processed_lines.append(line)
                    for k in range(i + 1, j):
                        processed_lines.append(lines[k])
                    i = j
            else:
                processed_lines.append(line)
                i += 1
        
        usfm_merged = '\n'.join(processed_lines)

        print("\n=== Final USFM Content ===")
        print(repr(usfm_merged))
        print("=========================")

        # 5. Save new draft
        new_draft = TranslationDraft(
            project_id=project_id,
            draft_name=f"verse_draft_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}",
            content=usfm_merged,
            format="usfm",
            file_size=len(usfm_merged.encode("utf-8")),
            download_count=0,
        )
        db.add(new_draft)
        db.commit()
        db.refresh(new_draft)

        return new_draft


# Create a singleton instance
translation_service = TranslationService()
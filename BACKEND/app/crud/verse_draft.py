import re
from sqlalchemy import UUID
from sqlalchemy.orm import Session, joinedload
from app.schemas.translation_draft import UpdateDraftRequest
from app.models.verse import Verse
from app.models.verse_tokens import VerseTokenTranslation
from app.models.translation_draft import TranslationDraft
from app.models.book import Book
from app.models.chapter import Chapter
from uuid import uuid4
from datetime import datetime
from typing import Dict, List, Tuple, Optional
from fastapi import HTTPException
from collections import defaultdict, Counter


class TranslationService:
    def _token_spans(self, text: str) -> List[Tuple[int, int]]:
        """
        Return a list of (start, end) spans for word-like tokens in text.
        Uses Unicode-aware word regex so Devanagari and Latin both match.
        """
        return [(m.start(), m.end()) for m in re.finditer(r'\w+', text, flags=re.UNICODE)]
 
    def extract_inline_tags(self, text: str) -> List[Tuple[str, str, bool, int]]:
        """
        Extract inline USFM tags like '\nd Lord\nd*' from text.
        Returns list of tuples: (tag_name, tagged_text, closing_star_bool, start_pos_in_plain_text)
        """
        if not text:
            return []
 
        tag_re = re.compile(r'\\(?P<tag>[A-Za-z]+\d*)\s*(?P<content>.*?)\\(?P=tag)(?P<star>\*?)', flags=re.DOTALL)
 
        tags = []
        plain_parts = []
        last_end = 0
 
        for m in tag_re.finditer(text):
            start, end = m.span()
            plain_parts.append(text[last_end:start])
            inner = m.group('content')
            plain_start = sum(len(p) for p in plain_parts)
            tags.append((m.group('tag'), inner.strip(), bool(m.group('star')), plain_start))
            plain_parts.append(inner)
            last_end = end
 
        plain_parts.append(text[last_end:])
        return tags
 
    def apply_tags_to_translation(self, original_text: str, translated_text: str) -> str:
        """
        Reapply inline tags from original_text into translated_text.
        """
        if not original_text or not translated_text:
            return translated_text or original_text
 
        tags = self.extract_inline_tags(original_text)
        if not tags:
            return translated_text
 
        plain_original = re.sub(r'\\([A-Za-z]+\d*)\s*(.*?)\\\1(\*?)', r'\2', original_text, flags=re.DOTALL)
        orig_spans = self._token_spans(plain_original)
        trans_words = re.findall(r'\S+', translated_text)
 
        wraps = {}
 
        for tag_name, inner_text, star_bool, plain_start in tags:
            token_idx = None
            for idx, (s, e) in enumerate(orig_spans):
                if s <= plain_start < e:
                    token_idx = idx
                    break
 
            if token_idx is None and orig_spans:
                token_idx = min(range(len(orig_spans)), key=lambda j: abs(orig_spans[j][0] - plain_start))
 
            if token_idx is None:
                trans_idx = 0
            else:
                trans_idx = min(token_idx, max(0, len(trans_words) - 1))
 
            open_marker = f"\\{tag_name}"
            close_marker = f"\\{tag_name}{'*' if star_bool else ''}"
            wraps.setdefault(trans_idx, []).append((open_marker, close_marker))
 
        for idx in sorted(wraps.keys()):
            if idx < 0 or idx >= len(trans_words):
                all_wrappers = wraps[idx]
                prefix = ''.join(o for o, c in all_wrappers)
                suffix = ''.join(c for o, c in reversed(all_wrappers))
                translated_text = f"{prefix}{translated_text}{suffix}"
            else:
                token = trans_words[idx]
                if not token:
                    continue
                for open_marker, close_marker in wraps[idx]:
                    token = f"{open_marker}{token}{close_marker}"
                trans_words[idx] = token
 
        return ' '.join(trans_words)

    def split_text_intelligently(self, text: str, num_parts: int) -> List[str]:
        """
        Robust split that preserves all translated words.
        """
        if num_parts <= 1:
            return [text]

        if not text:
            return ['' for _ in range(num_parts)]

        normalized = re.sub(r'\s+', ' ', text.strip(), flags=re.UNICODE)
        trans_words = re.findall(r'\S+', normalized, flags=re.UNICODE)
        total = len(trans_words)

        if total == 0:
            return ['' for _ in range(num_parts)]

        if total <= num_parts:
            parts = []
            for i in range(num_parts):
                parts.append(trans_words[i] if i < total else '')
            return parts

        base = total // num_parts
        remainder = total % num_parts

        parts = []
        pos = 0
        for i in range(num_parts):
            take = base + (1 if i < remainder else 0)
            if take > 0:
                slice_words = trans_words[pos: pos + take]
                parts.append(' '.join(slice_words))
                pos += take
            else:
                parts.append('')
        
        if pos < total:
            leftover = ' '.join(trans_words[pos:])
            parts[-1] = (parts[-1] + ' ' + leftover).strip()

        return parts
 
    def process_verse_block(self, lines: List[str], start_idx: int) -> Tuple[List[str], List[int], int]:
        verse_lines = []
        text_line_indices = []
        i = start_idx
 
        while i < len(lines):
            line = lines[i].strip()
            if i > start_idx and (re.match(r'\\v\s+\d+', line) or
                                  re.match(r'\\c\s+\d+', line) or
                                  re.match(r'\\s\d*\b', line) or
                                  re.match(r'\\p\b', line) or
                                  re.match(r'\\id\b', line)):
                break
 
            verse_lines.append(lines[i])
            if self.line_contains_text(line):
                text_line_indices.append(len(verse_lines) - 1)
            i += 1
 
        return verse_lines, text_line_indices, i
 
    def line_contains_text(self, line: str) -> bool:
        line = line.strip()
        if not line:
            return False
        text = re.sub(r'^\\v\s+\d+\s*', '', line)
        text = re.sub(r'^\\[a-z]+\d*\*?\s*', '', text)
        return bool(text.strip())
 
    def extract_text_from_line(self, line: str) -> str:
        line = line.strip()
        if not line:
            return ""
        text = re.sub(r'^\\v\s+\d+\s*', '', line)
        text = re.sub(r'^\\[a-z]+\d*\*?\s*', '', text)
        return text.strip()
 
    def rebuild_verse_with_translation(
        self,
        verse_lines: List[str],
        text_line_indices: List[int],
        translated_text: str
    ) -> List[str]:
        """
        Rebuild the verse keeping all translated text.
        """
        if not text_line_indices:
            return verse_lines

        original_segments = []
        for idx in text_line_indices:
            original_segments.append(self.extract_text_from_line(verse_lines[idx]) if 0 <= idx < len(verse_lines) else '')
        
        parts = self.split_text_intelligently(translated_text or "", len(original_segments))
        result = []
        part_idx = 0
        
        for i, line in enumerate(verse_lines):
            if i in text_line_indices and part_idx < len(parts):
                part = parts[part_idx].strip()
                if i == 0:
                    m = re.match(r'(\\v\s+\d+)\s*(.*)', line)
                    if m:
                        marker = m.group(1)
                        original_text = m.group(2)
                        translated_with_tags = self.apply_tags_to_translation(original_text, part)
                        if translated_with_tags:
                            result.append(f"{marker} {translated_with_tags}")
                        else:
                            result.append(f"{marker}")
                    else:
                        result.append(f"{line} {part}" if part else line)
                else:
                    marker_m = re.match(r'(\\[a-z]+\d*\*?\s*)', line)
                    if marker_m:
                        marker = marker_m.group(1)
                        original_text = self.extract_text_from_line(line)
                        translated_with_tags = self.apply_tags_to_translation(original_text, part)
                        if translated_with_tags:
                            result.append(f"{marker}{translated_with_tags}")
                        else:
                            result.append(marker.rstrip())
                    else:
                        result.append(part if part else "")
                part_idx += 1
            else:
                if self.line_contains_text(line):
                    marker_m = re.match(r'(\\[a-z]+\d*\*?\s*)', line)
                    if marker_m:
                        result.append(marker_m.group(1).rstrip())
                    else:
                        result.append("")
                else:
                    result.append(line)
 
        if part_idx < len(parts):
            remaining = ' '.join(p for p in parts[part_idx:] if p).strip()
            if remaining:
                appended = False
                for j in range(len(result) - 1, -1, -1):
                    if not result[j].startswith('\\'):
                        result[j] = (result[j] + ' ' + remaining).strip()
                        appended = True
                        break
                if not appended:
                    result.append(remaining)
 
        return result
 
    def generate_draft_from_verses(
        self,
        db: Session,
        project_id: UUID,
        book_name: str | None = None
    ):
        translated_verses = (
            db.query(VerseTokenTranslation)
            .join(VerseTokenTranslation.verse)
            .join(Verse.chapter)
            .join(Chapter.book)
            .options(
                joinedload(VerseTokenTranslation.verse)
                .joinedload(Verse.chapter)
                .joinedload(Chapter.book)
            )
            .filter(VerseTokenTranslation.project_id == project_id)
            .filter(VerseTokenTranslation.is_active == True)
            .order_by(
                Chapter.chapter_number,
                Verse.verse_number,
                VerseTokenTranslation.created_at.desc()
            )
        )
    
        if book_name:
            translated_verses = translated_verses.filter(Chapter.book.has(Book.book_name == book_name))
    
        translated_verses = translated_verses.all()
        
        if not translated_verses:
            return None
    
        if not book_name:
            first = translated_verses[0]
            book_name = getattr(first, "book_name", None) or getattr(first.verse.chapter.book, "book_name", None)
    
        book = db.query(Book).filter(Book.book_name == book_name).first()
        if not book or not book.usfm_content:
            return None
    
        usfm_content = book.usfm_content
    
        # Group all tokens by verse_id
        verse_translations = defaultdict(list)
        
        for v in translated_verses:
            if v.verse is not None:
                translation = v.verse_translated_text if v.verse_translated_text is not None else ""
                verse_translations[str(v.verse_id)].append(translation)
        
        # Join all token translations for each verse
        verse_map = {
            verse_id: ' '.join(translations).strip()
            for verse_id, translations in verse_translations.items()
        }
        
        # Build verse lookup - keep ALL verse_ids
        verse_lookup = {}
        for v in translated_verses:
            if v.verse is not None and v.verse.chapter is not None:
                verse_lookup[str(v.verse_id)] = (v.verse.chapter.chapter_number, v.verse.verse_number)
        
        lines = usfm_content.splitlines()
        result_lines = []
        current_chapter = 1
        i = 0
    
        while i < len(lines):
            line = lines[i].strip()
            chapter_match = re.match(r'\\c\s+(\d+)', line)
            if chapter_match:
                current_chapter = int(chapter_match.group(1))
                result_lines.append(lines[i])
                i += 1
                continue
    
            verse_match = re.match(r'\\v\s+(\d+)', line)
            if verse_match:
                verse_number = int(verse_match.group(1))
                verse_lines, text_indices, next_i = self.process_verse_block(lines, i)
    
                # Find ALL verse_ids for this chapter:verse
                matching_verse_ids = []
                for vid, (chap, vnum) in verse_lookup.items():
                    if chap == current_chapter and vnum == verse_number:
                        matching_verse_ids.append(vid)
                
                # Get the BEST translation (prefer manually edited/most recent)
                all_translations = {}
                for vid in matching_verse_ids:
                    trans = verse_map.get(vid, '')
                    if trans and trans.strip():
                        all_translations[vid] = trans
                
                # Find the unique/different translation (likely the manual edit)
                translated_text = ''
                if all_translations:
                    trans_values = list(all_translations.values())
                    
                    if len(set(trans_values)) == 1:
                        # All translations are the same
                        translated_text = trans_values[0]
                    else:
                        # Find the least common one (likely the manual edit)
                        counts = Counter(trans_values)
                        translated_text = min(counts.items(), key=lambda x: x[1])[0]
    
                if translated_text:
                    new_lines = self.rebuild_verse_with_translation(verse_lines, text_indices, translated_text)
                    result_lines.extend(new_lines)
                else:
                    result_lines.extend(verse_lines)
    
                i = next_i
            else:
                result_lines.append(lines[i])
                i += 1
    
        updated_usfm = "\n".join(result_lines)
    
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
    
    def update_draft(self, db: Session, draft_id: UUID, request: UpdateDraftRequest):
        draft = db.query(TranslationDraft).filter(TranslationDraft.draft_id == draft_id).first()
        if not draft:
            raise HTTPException(status_code=404, detail="Draft not found")

        if request.content:
            draft.content = request.content
            draft.file_size = request.file_size or len(request.content.encode("utf-8"))

        if request.draft_name:
            draft.draft_name = request.draft_name

        if request.format:
            draft.format = request.format

        db.commit()
        db.refresh(draft)
        return draft
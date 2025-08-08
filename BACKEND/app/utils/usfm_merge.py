import re

def replace_usfm_verse_text(draft_usfm: str, verse_translation_map: dict[int, str]) -> str:
    lines = draft_usfm.splitlines()
    merged_lines = []
    current_verse_id = None
    collecting = False
    verse_buffer = []
    tag_buffer = []

    def flush_buffer(verse_id):
        translated = verse_translation_map.get(verse_id)
        if not translated:
            return verse_buffer  # no change

        # Split translated text by punctuation to try to match number of lines
        parts = re.split(r'(?<=[.!?])\s+', translated.strip())
        parts += [''] * (len(tag_buffer) - len(parts))  # pad if needed

        new_lines = []
        for i, tag in enumerate(tag_buffer):
            text = parts[i] if i < len(parts) else ''
            new_lines.append(f"{tag} {text.strip()}")
        return new_lines

    for line in lines:
        # Match start of verse
        v_match = re.match(r"\\v (\d+)", line)
        if v_match:
            if collecting:
                merged_lines.extend(flush_buffer(current_verse_id))
                verse_buffer.clear()
                tag_buffer.clear()

            current_verse_id = int(v_match.group(1))
            collecting = True
            verse_buffer = [line]
            tag_buffer = [f"\\v {current_verse_id}"]
            continue

        elif collecting:
            # If it's a continuation like \q1 or \q2, collect tag
            tag_match = re.match(r"(\\q\d+|\\p|\\b|\\s\d+)", line)
            if tag_match:
                tag_buffer.append(tag_match.group(1))
                verse_buffer.append(line)
                continue

            # If line does not start with formatting tag, treat it as outside
            merged_lines.extend(flush_buffer(current_verse_id))
            collecting = False
            verse_buffer.clear()
            tag_buffer.clear()

        merged_lines.append(line)

    if collecting:
        merged_lines.extend(flush_buffer(current_verse_id))

    return "\n".join(merged_lines)

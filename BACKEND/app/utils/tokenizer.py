# app/utils/tokenizer.py
import re

def tokenize_text(text: str):
    # Simple whitespace + punctuation tokenizer
    return re.findall(r'\b\w+\b', text.lower())


# import re

# def tokenize_text(text: str):
#     return re.findall(r'\b[^\W\d_]+\b', text.lower(), flags=re.UNICODE)
import regex  
import unicodedata

def tokenize_text(text: str):
    text = unicodedata.normalize("NFC", text)
    pattern = r"\p{L}[\p{L}\p{M}\u200C\u200D'’-]*"
    tokens = regex.findall(pattern, text, flags=regex.IGNORECASE)
    return [t.lower() for t in tokens]

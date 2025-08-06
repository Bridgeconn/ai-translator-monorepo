
import re

def tokenize_text(text: str):
    return re.findall(r'\b[^\W\d_]+\b', text.lower(), flags=re.UNICODE)

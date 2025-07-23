📖 AI Bible Translator – Backend
This is the backend for the AI Bible Translator application. Built using FastAPI, it supports uploading source files, tokenizing Bible text, integrating with the Vachan AI translation engine, and managing translation data efficiently.

✅ Project Setup (Using Miniconda)
1. 📦 Install Miniconda (if not already)
Download the installer: https://docs.conda.io/en/latest/miniconda.html

Then run:

bash Miniconda3-latest-Linux-x86_64.sh
2. 🐍 Create and activate environment
conda create --name bible-translator python=3.10 -y
conda activate bible-translator
3. 📥 Install dependencies
pip install -r requirements.txt
4. 🚀 Run the server
uvicorn app.main:app --reload
Visit: http://localhost:8000/docs

📂 Folder Structure
BACKEND/
│
├── app/
│   ├── main.py                    # FastAPI app entrypoint
│   │
│   ├── database/
│   │   ├── database.py           # DB connection setup
│   │   ├── models.py             # SQLAlchemy models
│   │   └── schemas.py            # Pydantic schemas for API I/O
│   │
│   └── utilities/
│       ├── file_access.py        # Upload, delete, and read files
│       ├── translation.py        # Save, edit, track translations
│       ├── usfm_grammar.py       # Tokenization logic (word/verse)
│       └── vachan_ai.py          # Vachan AI API integration
│
├── main.py
├── miniconda3/                   # Conda environment (local)
├── .gitignore
├── README.md
├── requirements.txt
└── requirements-dev.txt
🔧 Features Implemented
✅ Upload source file (USFM or text)
✅ Delete uploaded file
✅ Tokenize (by word or verse)
✅ Save/Edit Translations
✅ Translate using Vachan AI
✅ Track progress (tokens completed)
✅ Download translated text (PDF/DOCX)
✅ Structured DB models with UUID support
✅ Secure JWT-ready structure (to be plugged)
🛠 Tech Stack
Python 3.10, FastAPI, SQLAlchemy
PostgreSQL
Pydantic v2
Uvicorn ASGI
Miniconda
Vachan AI API for translation
nltk, regex, python-docx, reportlab
🗂 Future Additions
[ ] Auth via external plugin (user & project)
[ ] Role-based access (admin, translator)
[ ] Full-text search
[ ] Redis caching layer
[ ] Email notifications
✍ Author
Built by the AI Bible Translator team. Contributions welcome.
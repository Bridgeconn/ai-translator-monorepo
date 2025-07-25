# AI Translator App Database Workflow With All Attributes (we planned for)

---

Note : User details is just for tracking project status

### User Table Structure:
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY,           -- Unique user identifier
    username VARCHAR(50) UNIQUE,   -- Login username
    email VARCHAR(255) UNIQUE,     -- Email address
    password_hash VARCHAR(255),    -- Encrypted password
    full_name VARCHAR(100),        -- Display name
    created_at TIMESTAMP,          -- When account was created
    updated_at TIMESTAMP,          -- Last profile update
    is_active BOOLEAN              -- Account status
);
```

---

### Languages Table Structure:
```sql
CREATE TABLE languages (
    id UUID PRIMARY KEY,           -- Unique language identifier
    name VARCHAR(100),             -- English name
    code VARCHAR(10) UNIQUE,       -- ISO code (en, hi, ta)
    created_at TIMESTAMP           -- When added to system
);
```

---

### Sources Table Structure:
```sql
CREATE TABLE sources (
    id UUID PRIMARY KEY,           -- Unique source identifier
    name VARCHAR(100),             -- Source name (KJV, NIV)
    language_code VARCHAR(10),     -- Redundant for quick access
    description TEXT,              -- Source description
    created_at TIMESTAMP,          -- When source was created
    updated_at TIMESTAMP,          -- Last modification
    is_active BOOLEAN              -- Source status
);
```

---


### Books Table Structure:
```sql
CREATE TABLE books (
    id UUID PRIMARY KEY,           -- Unique book identifier
    source_id UUID,                -- Links to sources table
    book_code VARCHAR(10),         -- Standard code (GEN, EXO, MAT)
    book_name VARCHAR(50),         -- Human-readable name
    book_number INTEGER,           -- Canonical order (1-66)
    testament VARCHAR(10),         -- OT or NT
    usfm_content TEXT,             -- Raw USFM file content
    uploaded_at TIMESTAMP,         -- When file was uploaded
);
```

---


### Chapters Table Structure:
```sql
CREATE TABLE chapters (
    id UUID PRIMARY KEY,           -- Unique chapter identifier  
    book_id UUID,                  -- Links to books table
    chapter_number INTEGER,        -- Chapter number (1, 2, 3...)
    created_at TIMESTAMP           -- When chapter was parsed
);
```

### Verses Table Structure:
```sql
CREATE TABLE verses (
    id UUID PRIMARY KEY,           -- Unique verse identifier
    usfm_tags TEXT,             -- USFM formatting info
    chapter_id UUID,               -- Links to chapters table  
    verse_number INTEGER,          -- Verse number (1, 2, 3...)
    content TEXT,                  -- Actual verse text
    created_at TIMESTAMP           -- When verse was parsed
);
```

---


### Translation Table Structure:
```sql
CREATE TABLE translation_projects (
    id UUID PRIMARY KEY,           -- Unique project identifier
    name VARCHAR(100),             -- Project name
    source_id UUID,                -- Links to sources table (what to translate from)
    target_language_id UUID,       -- Links to languages table (what to translate to)
    tokenization_type VARCHAR(10), -- 'word' or 'verse'
    status VARCHAR(20),            -- 'draft', 'in_progress', 'completed'
    created_at TIMESTAMP,          -- Project creation time
    updated_at TIMESTAMP           -- Last project update
);
```

---


### Word Tokens Table Structure:
```sql
CREATE TABLE word_tokens (
    id UUID PRIMARY KEY,           -- Unique token identifier
    project_id UUID,               -- Links to translation_projects
    verse_id UUID,                 -- Links to verses table
    token_text VARCHAR(255),       -- The actual word
    created_at TIMESTAMP           -- When token was created
);
```


---

## 🔤 **STEP 8: System Creates Unique Token List**

### Unique Tokens Table Structure:
```sql
CREATE TABLE unique_tokens (
    id UUID PRIMARY KEY,           -- Unique token identifier
    project_id UUID,               -- Links to translation_projects  
    token_text VARCHAR(255),       -- The unique word
    frequency INTEGER,             -- How many times it appears
    is_translated BOOLEAN,         -- Has it been translated?
    created_at TIMESTAMP           -- When first encountered
);
```




### Word Translations Table Structure:
```sql
CREATE TABLE word_translations (
    id UUID PRIMARY KEY,           -- Unique translation identifier
    unique_token_id UUID,          -- Links to unique_tokens
    translated_text VARCHAR(500),  -- The translated word
    created_at TIMESTAMP,          -- When translation was created
    updated_at TIMESTAMP,          -- Last modification
    is_approved BOOLEAN            -- User approval status
);
```
#
---


#### Verse Translations Table Structure:
```sql
CREATE TABLE verse_translations (
    id UUID PRIMARY KEY,           -- Unique verse translation identifier
    project_id UUID,               -- Links to translation_projects
    verse_id UUID,                 -- Links to verses table
    translated_text TEXT,          -- Complete translated verse
    created_at TIMESTAMP,          -- When translation was created
    updated_at TIMESTAMP,          -- Last modification
    is_approved BOOLEAN            -- User approval status
);
```


---

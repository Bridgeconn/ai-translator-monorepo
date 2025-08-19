-- Table 1: users
CREATE TABLE users (
    user_id UUID PRIMARY KEY,                    -- Unique user identifier
    username VARCHAR(50) UNIQUE,                 -- User's login name
    email VARCHAR(255) UNIQUE,                   -- Email address
    password_hash VARCHAR(255) NOT NULL,        -- Encrypted password
    full_name VARCHAR(100),                      -- Display full name
    role VARCHAR(50) DEFAULT 'user',             -- Role
    jti VARCHAR(36) UNIQUE,                      -- Id for JWT token
    token TEXT UNIQUE,                           -- JWT token
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,  -- Account creation time
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,  -- Last update time
    is_active BOOLEAN NOT NULL                   -- User status
);

-- Table 2: languages
CREATE TABLE languages (
    language_id UUID PRIMARY KEY,               -- Unique language id
    name VARCHAR(100) NOT NULL UNIQUE,          -- Language name
    bcp_code VARCHAR(255),                       -- BCP Code
    iso_code VARCHAR(255) NOT NULL,             -- ISO Code
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,  -- Language creation time
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,  -- Last update time
    is_active BOOLEAN NOT NULL                   -- Active/inactive status
);

-- Table 3: versions
CREATE TABLE versions (
    version_id UUID PRIMARY KEY,                -- Unique version id
    version_name VARCHAR(255),                   -- Version name
    version_abbreviation VARCHAR(255),           -- Version of bibles
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,  -- Creation time
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,  -- Last update time
    is_active BOOLEAN NOT NULL                   -- Active/inactive status
);

-- Table 4: sources
CREATE TABLE sources (
    source_id UUID PRIMARY KEY,                 -- Unique source id
    language_id UUID,                           -- Language id (Foreign key)
    language_name VARCHAR(255) NOT NULL,        -- Language name
    version_id UUID,                            -- Version id (Foreign key)
    version_name VARCHAR(255) NOT NULL,         -- Version name
    description TEXT,                           -- Source description
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,  -- Source creation time
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,  -- Last update time
    is_active BOOLEAN NOT NULL,                 -- Active/inactive status
    FOREIGN KEY (language_id) REFERENCES languages(language_id),
    FOREIGN KEY (version_id) REFERENCES versions(version_id)
);

-- Table 5: book_details
CREATE TABLE book_details (
    book_details_id INTEGER PRIMARY KEY,        -- Book id
    book_name VARCHAR(255) NOT NULL,            -- Book name
    book_code VARCHAR(255) NOT NULL,            -- Book code
    book_number INTEGER NOT NULL,               -- Book number
    testament VARCHAR(255) NOT NULL,            -- Testament
    chapter_count INTEGER NOT NULL,             -- No of chapters in book
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,  -- Uploaded time
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,  -- Last updated time
    is_active BOOLEAN NOT NULL                   -- Active/inactive status
);

-- Table 6: books
CREATE TABLE books (
    book_id UUID PRIMARY KEY,                   -- Unique book id
    source_id UUID,                             -- Source id (Foreign key)
    book_code VARCHAR(255) NOT NULL,            -- Book code (example - GEN)
    book_name VARCHAR(255) NOT NULL,            -- Book name
    book_number INTEGER NOT NULL,               -- Book number
    testament VARCHAR(255) NOT NULL,            -- Testament (OT/NT)
    usfm_content TEXT,                          -- Raw content of book
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,  -- Uploaded time
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,  -- Last updated time
    is_active BOOLEAN NOT NULL,                 -- Active/inactive status
    FOREIGN KEY (source_id) REFERENCES sources(source_id)
);

-- Table 7: chapters
CREATE TABLE chapters (
    chapter_id UUID PRIMARY KEY,                -- Unique chapter id
    book_id UUID,                               -- Book id (Foreign key)
    chapter_number INTEGER NOT NULL,            -- Chapter number
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,  -- Creation time
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,  -- Last update time
    is_active BOOLEAN NOT NULL,                 -- Active/inactive status
    FOREIGN KEY (book_id) REFERENCES books(book_id)
);

-- Table 8: verses
CREATE TABLE verses (
    verse_id UUID PRIMARY KEY,                  -- Unique verse id
    chapter_id UUID,                            -- Chapter id (Foreign key)
    verse_number INTEGER NOT NULL,              -- Verse number in chapter
    content TEXT NOT NULL,                      -- Verse content
    usfm_tags TEXT NOT NULL,                    -- Tags of usfm (example - /p, /v)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,  -- Verse upload time
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,  -- Last updated time
    is_active BOOLEAN NOT NULL,                 -- Active/inactive status
    FOREIGN KEY (chapter_id) REFERENCES chapters(chapter_id)
);

-- Table 9: projects
CREATE TABLE projects (
    project_id UUID PRIMARY KEY,                -- Unique project id
    name VARCHAR(255) NOT NULL,                 -- Project name
    source_id UUID,                             -- Source id (Foreign key)
    target_language_id UUID,                    -- Target language id (Foreign key)
    translation_type VARCHAR(255) NOT NULL,     -- word or verse
    selected_books JSON,                        -- Array of book ids selected
    status VARCHAR(255) DEFAULT 'created',      -- created, processing, completed, draft_ready
    progress DECIMAL,                           -- Progress in %
    total_items INTEGER,                        -- Total tokens to translate
    completed_items INTEGER,                    -- Total translated tokens
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,  -- Project creation time
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,  -- Last update time
    is_active BOOLEAN NOT NULL,                 -- Active/inactive status
    FOREIGN KEY (source_id) REFERENCES sources(source_id),
    FOREIGN KEY (target_language_id) REFERENCES languages(language_id)
);

-- Table 10: word_token_translation
CREATE TABLE word_token_translation (
    word_token_id UUID PRIMARY KEY,             -- Unique word token id
    project_id UUID,                            -- Project id (Foreign key)
    token_text VARCHAR(255) UNIQUE NOT NULL,    -- Unique word
    frequency INTEGER,                          -- How many times it appears
    translated_text TEXT,                       -- AI-generated translation
    is_reviewed BOOLEAN DEFAULT FALSE,          -- Manual review flag
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,  -- Creation time
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,  -- Updated time
    is_active BOOLEAN NOT NULL,                 -- Active/inactive status
    FOREIGN KEY (project_id) REFERENCES projects(project_id)
);

-- Table 11: verse_token_translation
CREATE TABLE verse_token_translation (
    verse_token_id UUID PRIMARY KEY,            -- Unique verse id
    project_id UUID,                            -- Project id (Foreign key)
    verse_id UUID,                              -- Verse id (Foreign key)
    verse_translated_text TEXT,                 -- AI-translation
    is_reviewed BOOLEAN DEFAULT FALSE,          -- Manual review flag
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,  -- Creation time
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,  -- Last update time
    is_active BOOLEAN NOT NULL,                 -- Active/inactive status
    FOREIGN KEY (project_id) REFERENCES projects(project_id),
    FOREIGN KEY (verse_id) REFERENCES verses(verse_id)
);

-- Table 12: translation_draft
CREATE TABLE translation_draft (
    draft_id UUID PRIMARY KEY,                  -- Unique draft id
    project_id UUID,                            -- Project id (Foreign key)
    draft_name VARCHAR(255) NOT NULL,           -- Draft name
    content TEXT NOT NULL,                      -- Content of the draft (translated file)
    format VARCHAR(255) DEFAULT 'usfm',         -- Type of format of draft
    file_size INTEGER,                          -- Size of the file or draft
    download_count INTEGER,                     -- Number of downloads for tracking
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,  -- Creation time of draft
    FOREIGN KEY (project_id) REFERENCES projects(project_id)
);
**Database Schema:**

--- Users Table

CREATE TABLE users (
    id UUID PRIMARY KEY,           -- Unique user identifier
    username VARCHAR(50) UNIQUE,   -- Login username
    email VARCHAR(255) UNIQUE,     -- Email address
    password_hash VARCHAR(255),    -- Encrypted password
    full_name VARCHAR(100),        -- Display name
    created_at TIMESTAMP,          -- When account was created
    updated_at TIMESTAMP,          -- Last profile update
    is_active BOOLEAN,              -- Account status
    user_role VARCHAR(100)
);

-- 1. Languages Table
CREATE TABLE languages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    code VARCHAR(10) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);
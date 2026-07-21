-- Idempotent PostgreSQL schema. Existing placement data is preserved on restart.
-- New report fields deliberately distinguish an observed interview date from when
-- PrepIntel received/imported the record.

CREATE TABLE IF NOT EXISTS companies (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(100) NOT NULL UNIQUE,
    oa_pattern VARCHAR(250) DEFAULT 'Unknown',
    has_limited_data BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS problems (
    id SERIAL PRIMARY KEY,
    leetcode_id INT NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    title_slug VARCHAR(255) NOT NULL UNIQUE,
    difficulty VARCHAR(20) NOT NULL,
    acceptance_rate DECIMAL(5, 2),
    url VARCHAR(255),
    topics VARCHAR(500) DEFAULT '',
    rating INT
);

CREATE TABLE IF NOT EXISTS interview_reports (
    id SERIAL PRIMARY KEY,
    company_id INT REFERENCES companies(id) ON DELETE CASCADE,
    problem_id INT REFERENCES problems(id) ON DELETE CASCADE,
    source VARCHAR(100) NOT NULL,
    -- Retained only for legacy imports. New ranking is based on reported_at.
    timeframe VARCHAR(50) NOT NULL DEFAULT 'all_time',
    round VARCHAR(50) NOT NULL DEFAULT 'OA',
    date_reported TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    report_count INT NOT NULL DEFAULT 1,
    notes TEXT,
    reported_at DATE,
    role VARCHAR(100) NOT NULL DEFAULT 'Unknown',
    batch_year INT,
    drive_type VARCHAR(100) NOT NULL DEFAULT 'Unknown',
    source_url VARCHAR(1000),
    source_type VARCHAR(50) NOT NULL DEFAULT 'LEGACY_IMPORT',
    verification_status VARCHAR(50) NOT NULL DEFAULT 'UNVERIFIED',
    verified_at TIMESTAMP
);

-- Bring databases created by earlier versions forward without dropping data.
ALTER TABLE companies ADD COLUMN IF NOT EXISTS oa_pattern VARCHAR(250) DEFAULT 'Unknown';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS has_limited_data BOOLEAN DEFAULT FALSE;
ALTER TABLE problems ADD COLUMN IF NOT EXISTS rating INT;
ALTER TABLE interview_reports ADD COLUMN IF NOT EXISTS reported_at DATE;
ALTER TABLE interview_reports ADD COLUMN IF NOT EXISTS role VARCHAR(100) NOT NULL DEFAULT 'Unknown';
ALTER TABLE interview_reports ADD COLUMN IF NOT EXISTS batch_year INT;
ALTER TABLE interview_reports ADD COLUMN IF NOT EXISTS drive_type VARCHAR(100) NOT NULL DEFAULT 'Unknown';
ALTER TABLE interview_reports ADD COLUMN IF NOT EXISTS source_url VARCHAR(1000);
ALTER TABLE interview_reports ADD COLUMN IF NOT EXISTS source_type VARCHAR(50) NOT NULL DEFAULT 'LEGACY_IMPORT';
ALTER TABLE interview_reports ADD COLUMN IF NOT EXISTS verification_status VARCHAR(50) NOT NULL DEFAULT 'UNVERIFIED';
ALTER TABLE interview_reports ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_reports_company_id ON interview_reports(company_id);
CREATE INDEX IF NOT EXISTS idx_reports_problem_id ON interview_reports(problem_id);
CREATE INDEX IF NOT EXISTS idx_reports_reported_at ON interview_reports(reported_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_company_role_date ON interview_reports(company_id, role, reported_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_verification_status ON interview_reports(verification_status);
CREATE INDEX IF NOT EXISTS idx_problems_difficulty ON problems(difficulty);

-- Drop tables if they exist (for easy re-runs / development)
DROP TABLE IF EXISTS interview_reports CASCADE;
DROP TABLE IF EXISTS problems CASCADE;
DROP TABLE IF EXISTS companies CASCADE;

-- 1. Companies Table
CREATE TABLE companies (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(100) NOT NULL UNIQUE,
    oa_pattern VARCHAR(250) DEFAULT 'Unknown',
    has_limited_data BOOLEAN DEFAULT FALSE
);

-- 2. Problems Table
CREATE TABLE problems (
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

-- 3. Interview Reports Table
CREATE TABLE interview_reports (
    id SERIAL PRIMARY KEY,
    company_id INT REFERENCES companies(id) ON DELETE CASCADE,
    problem_id INT REFERENCES problems(id) ON DELETE CASCADE,
    source VARCHAR(50) NOT NULL,
    timeframe VARCHAR(50) NOT NULL DEFAULT 'all_time',
    round VARCHAR(50) NOT NULL DEFAULT 'OA',
    date_reported TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    report_count INT NOT NULL DEFAULT 1,
    notes TEXT
);

-- Indexing for fast queries
CREATE INDEX idx_reports_company_id ON interview_reports(company_id);
CREATE INDEX idx_reports_problem_id ON interview_reports(problem_id);
CREATE INDEX idx_reports_timeframe ON interview_reports(timeframe);
CREATE INDEX idx_reports_round ON interview_reports(round);
CREATE INDEX idx_problems_difficulty ON problems(difficulty);
CREATE INDEX idx_problems_topics ON problems(topics);

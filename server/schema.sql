-- Attendance Tracker Database Schema
-- Run this script in your NeonDB console or use the setup script

-- Create users table for authentication
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'user')),
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);

-- Create students table
CREATE TABLE IF NOT EXISTS students (
    id SERIAL,
    system_id VARCHAR(20) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    dept VARCHAR(100) NOT NULL,
    section VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create teams table
CREATE TABLE IF NOT EXISTS teams (
    id SERIAL PRIMARY KEY,
    team_id VARCHAR(20) UNIQUE NOT NULL,
    team_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create student_teams junction table for many-to-many relationship
CREATE TABLE IF NOT EXISTS student_teams (
    id SERIAL PRIMARY KEY,
    student_id VARCHAR(20) REFERENCES students(system_id) ON DELETE CASCADE,
    team_id VARCHAR(20) REFERENCES teams(team_id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, team_id)
);

-- Create attendance table
CREATE TABLE IF NOT EXISTS attendance (
    id SERIAL PRIMARY KEY,
    student_id VARCHAR(20) REFERENCES students(system_id) ON DELETE CASCADE,
    date DATE NOT NULL,
    present BOOLEAN DEFAULT false,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    marked_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE(student_id, date)
);

-- Create settings table for feature toggles
CREATE TABLE IF NOT EXISTS settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_attendance_student_date ON attendance(student_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_marked_by ON attendance(marked_by);
CREATE INDEX IF NOT EXISTS idx_student_teams_student ON student_teams(student_id);
CREATE INDEX IF NOT EXISTS idx_student_teams_team ON student_teams(team_id);

-- Seed default settings
INSERT INTO settings (setting_key, setting_value, description)
VALUES ('team_feature_enabled', 'false', 'Enable or disable team-based attendance marking')
ON CONFLICT (setting_key) DO NOTHING;

INSERT INTO settings (setting_key, setting_value, description)
VALUES ('attendance_passcode', '', 'Daily passcode required for regular users to mark attendance')
ON CONFLICT (setting_key) DO NOTHING;

INSERT INTO settings (setting_key, setting_value, description)
VALUES ('attendance_passcode_expires_at', '', 'Expiry timestamp for the daily attendance passcode')
ON CONFLICT (setting_key) DO NOTHING;

-- Display created tables
SELECT 'Tables created successfully!' as status;

-- Attendance Tracker Database Schema
-- Run this script in your NeonDB console or use the setup script

-- Create students table
CREATE TABLE IF NOT EXISTS students (
    system_id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create attendance table
CREATE TABLE IF NOT EXISTS attendance (
    id SERIAL PRIMARY KEY,
    student_id VARCHAR(50) NOT NULL,
    date DATE NOT NULL,
    present BOOLEAN NOT NULL DEFAULT false,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(system_id) ON DELETE CASCADE,
    UNIQUE(student_id, date)
);

-- Database schema ready for your student data upload

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_attendance_student_date ON attendance(student_id, date);

-- Display created tables
SELECT 'Tables created successfully!' as status;

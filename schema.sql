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

-- Insert sample students for testing
INSERT INTO students (system_id, name) VALUES 
('STU001', 'John Doe'),
('STU002', 'Jane Smith'),
('STU003', 'Mike Johnson'),
('STU004', 'Sarah Wilson'),
('STU005', 'David Brown'),
('STU006', 'Emily Davis'),
('STU007', 'Chris Anderson'),
('STU008', 'Lisa Taylor'),
('STU009', 'Mark Thompson'),
('STU010', 'Anna Martinez'),
('STU011', 'Robert Garcia'),
('STU012', 'Michelle Lee'),
('STU013', 'James Wilson'),
('STU014', 'Jennifer Clark'),
('STU015', 'Michael Rodriguez'),
('STU016', 'Ashley Johnson'),
('STU017', 'Daniel Kim'),
('STU018', 'Jessica Brown'),
('STU019', 'Christopher Davis'),
('STU020', 'Amanda Miller')
ON CONFLICT (system_id) DO NOTHING;

-- Insert sample attendance data for testing
-- Today's attendance (some present, some absent)
INSERT INTO attendance (student_id, date, present, recorded_at) VALUES 
('STU001', CURRENT_DATE, true, CURRENT_TIMESTAMP - INTERVAL '2 hours'),
('STU002', CURRENT_DATE, true, CURRENT_TIMESTAMP - INTERVAL '1 hour 45 minutes'),
('STU003', CURRENT_DATE, false, CURRENT_TIMESTAMP - INTERVAL '1 hour 30 minutes'),
('STU004', CURRENT_DATE, true, CURRENT_TIMESTAMP - INTERVAL '1 hour 15 minutes'),
('STU005', CURRENT_DATE, true, CURRENT_TIMESTAMP - INTERVAL '1 hour'),
('STU006', CURRENT_DATE, false, CURRENT_TIMESTAMP - INTERVAL '45 minutes'),
('STU007', CURRENT_DATE, true, CURRENT_TIMESTAMP - INTERVAL '30 minutes'),
('STU008', CURRENT_DATE, true, CURRENT_TIMESTAMP - INTERVAL '15 minutes'),
('STU011', CURRENT_DATE, true, CURRENT_TIMESTAMP - INTERVAL '10 minutes'),
('STU012', CURRENT_DATE, false, CURRENT_TIMESTAMP - INTERVAL '5 minutes'),
('STU015', CURRENT_DATE, true, CURRENT_TIMESTAMP - INTERVAL '2 minutes')
ON CONFLICT (student_id, date) DO NOTHING;

-- Yesterday's attendance (full day example)
INSERT INTO attendance (student_id, date, present, recorded_at) VALUES 
('STU001', CURRENT_DATE - INTERVAL '1 day', true, CURRENT_DATE - INTERVAL '1 day' + INTERVAL '8 hours'),
('STU002', CURRENT_DATE - INTERVAL '1 day', true, CURRENT_DATE - INTERVAL '1 day' + INTERVAL '8 hours 15 minutes'),
('STU003', CURRENT_DATE - INTERVAL '1 day', true, CURRENT_DATE - INTERVAL '1 day' + INTERVAL '8 hours 30 minutes'),
('STU004', CURRENT_DATE - INTERVAL '1 day', false, CURRENT_DATE - INTERVAL '1 day' + INTERVAL '8 hours 45 minutes'),
('STU005', CURRENT_DATE - INTERVAL '1 day', true, CURRENT_DATE - INTERVAL '1 day' + INTERVAL '9 hours'),
('STU006', CURRENT_DATE - INTERVAL '1 day', true, CURRENT_DATE - INTERVAL '1 day' + INTERVAL '9 hours 15 minutes'),
('STU007', CURRENT_DATE - INTERVAL '1 day', true, CURRENT_DATE - INTERVAL '1 day' + INTERVAL '9 hours 30 minutes'),
('STU008', CURRENT_DATE - INTERVAL '1 day', false, CURRENT_DATE - INTERVAL '1 day' + INTERVAL '9 hours 45 minutes'),
('STU009', CURRENT_DATE - INTERVAL '1 day', true, CURRENT_DATE - INTERVAL '1 day' + INTERVAL '10 hours'),
('STU010', CURRENT_DATE - INTERVAL '1 day', true, CURRENT_DATE - INTERVAL '1 day' + INTERVAL '10 hours 15 minutes'),
('STU011', CURRENT_DATE - INTERVAL '1 day', false, CURRENT_DATE - INTERVAL '1 day' + INTERVAL '10 hours 30 minutes'),
('STU012', CURRENT_DATE - INTERVAL '1 day', true, CURRENT_DATE - INTERVAL '1 day' + INTERVAL '10 hours 45 minutes'),
('STU013', CURRENT_DATE - INTERVAL '1 day', true, CURRENT_DATE - INTERVAL '1 day' + INTERVAL '11 hours'),
('STU014', CURRENT_DATE - INTERVAL '1 day', true, CURRENT_DATE - INTERVAL '1 day' + INTERVAL '11 hours 15 minutes'),
('STU015', CURRENT_DATE - INTERVAL '1 day', true, CURRENT_DATE - INTERVAL '1 day' + INTERVAL '11 hours 30 minutes')
ON CONFLICT (student_id, date) DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_attendance_student_date ON attendance(student_id, date);

-- Display created tables
SELECT 'Tables created successfully!' as status;

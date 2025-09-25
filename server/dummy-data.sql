-- Dummy Data for Attendance Tracker
-- Run this script to populate your database with sample data

-- Create tables if they don't exist
CREATE TABLE IF NOT EXISTS students (
  id SERIAL PRIMARY KEY,
  system_id VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  team_id VARCHAR(20),
  dept VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS teams (
  id SERIAL PRIMARY KEY,
  team_id VARCHAR(20) UNIQUE NOT NULL,
  team_name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS attendance (
  id SERIAL PRIMARY KEY,
  student_id VARCHAR(20) REFERENCES students(system_id),
  date DATE NOT NULL,
  present BOOLEAN NOT NULL DEFAULT false,
  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Clear existing data (optional - remove these lines if you want to keep existing data)
DELETE FROM attendance;
DELETE FROM students;
DELETE FROM teams;

-- Insert Teams
INSERT INTO teams (team_id, team_name) VALUES
('TEAM001', 'Web Development Team'),
('TEAM002', 'Mobile App Team'),
('TEAM003', 'Data Science Team'),
('TEAM004', 'AI/ML Team'),
('TEAM005', 'DevOps Team');

-- Insert Students
INSERT INTO students (system_id, name, team_id, dept) VALUES
-- Web Development Team
('WEB001', 'Arjun Sharma', 'TEAM001', 'Computer Science Engineering'),
('WEB002', 'Priya Patel', 'TEAM001', 'Computer Science Engineering'),
('WEB003', 'Rahul Kumar', 'TEAM001', 'Information Technology'),
('WEB004', 'Sneha Gupta', 'TEAM001', 'Computer Science Engineering'),
('WEB005', 'Vikram Singh', 'TEAM001', 'Information Technology'),

-- Mobile App Team
('MOB001', 'Anita Desai', 'TEAM002', 'Information Technology'),
('MOB002', 'Karan Mehta', 'TEAM002', 'Computer Science Engineering'),
('MOB003', 'Pooja Jain', 'TEAM002', 'Information Technology'),
('MOB004', 'Rohit Agarwal', 'TEAM002', 'Computer Science Engineering'),

-- Data Science Team
('DS001', 'Deepika Rao', 'TEAM003', 'Data Science'),
('DS002', 'Amit Verma', 'TEAM003', 'Statistics'),
('DS003', 'Kavya Nair', 'TEAM003', 'Mathematics'),
('DS004', 'Suresh Reddy', 'TEAM003', 'Data Science'),
('DS005', 'Meera Iyer', 'TEAM003', 'Computer Science Engineering'),
('DS006', 'Rajesh Pandey', 'TEAM003', 'Statistics'),

-- AI/ML Team
('AI001', 'Sanjay Chopra', 'TEAM004', 'Artificial Intelligence'),
('AI002', 'Nisha Bansal', 'TEAM004', 'Machine Learning'),
('AI003', 'Aryan Malhotra', 'TEAM004', 'Computer Science Engineering'),
('AI004', 'Ritu Saxena', 'TEAM004', 'Artificial Intelligence'),

-- DevOps Team
('DEV001', 'Manish Tiwari', 'TEAM005', 'Software Engineering'),
('DEV002', 'Shweta Bhatt', 'TEAM005', 'Information Technology'),
('DEV003', 'Nikhil Joshi', 'TEAM005', 'Computer Science Engineering'),

-- Students without teams
('STU001', 'Aarav Kapoor', NULL, 'Electronics Engineering'),
('STU002', 'Diya Sharma', NULL, 'Mechanical Engineering'),
('STU003', 'Ishaan Gupta', NULL, 'Civil Engineering');

-- Insert attendance data for today
INSERT INTO attendance (student_id, date, present, recorded_at) VALUES
-- Present students for today
('WEB001', CURRENT_DATE, true, CURRENT_TIMESTAMP),
('WEB002', CURRENT_DATE, true, CURRENT_TIMESTAMP),
('WEB004', CURRENT_DATE, true, CURRENT_TIMESTAMP),
('MOB001', CURRENT_DATE, true, CURRENT_TIMESTAMP),
('MOB003', CURRENT_DATE, true, CURRENT_TIMESTAMP),
('DS001', CURRENT_DATE, true, CURRENT_TIMESTAMP),
('DS002', CURRENT_DATE, true, CURRENT_TIMESTAMP),
('DS005', CURRENT_DATE, true, CURRENT_TIMESTAMP),
('AI001', CURRENT_DATE, true, CURRENT_TIMESTAMP),
('AI003', CURRENT_DATE, true, CURRENT_TIMESTAMP),
('DEV001', CURRENT_DATE, true, CURRENT_TIMESTAMP),
('STU001', CURRENT_DATE, true, CURRENT_TIMESTAMP),

-- Absent students for today
('WEB003', CURRENT_DATE, false, CURRENT_TIMESTAMP),
('WEB005', CURRENT_DATE, false, CURRENT_TIMESTAMP),
('MOB002', CURRENT_DATE, false, CURRENT_TIMESTAMP),
('MOB004', CURRENT_DATE, false, CURRENT_TIMESTAMP),
('DS003', CURRENT_DATE, false, CURRENT_TIMESTAMP),
('DS004', CURRENT_DATE, false, CURRENT_TIMESTAMP),
('DS006', CURRENT_DATE, false, CURRENT_TIMESTAMP),
('AI002', CURRENT_DATE, false, CURRENT_TIMESTAMP),
('AI004', CURRENT_DATE, false, CURRENT_TIMESTAMP),
('DEV002', CURRENT_DATE, false, CURRENT_TIMESTAMP),
('DEV003', CURRENT_DATE, false, CURRENT_TIMESTAMP),
('STU002', CURRENT_DATE, false, CURRENT_TIMESTAMP),
('STU003', CURRENT_DATE, false, CURRENT_TIMESTAMP);

-- Insert some historical attendance data (yesterday)
INSERT INTO attendance (student_id, date, present, recorded_at) VALUES
('WEB001', CURRENT_DATE - INTERVAL '1 day', true, CURRENT_TIMESTAMP - INTERVAL '1 day'),
('WEB002', CURRENT_DATE - INTERVAL '1 day', false, CURRENT_TIMESTAMP - INTERVAL '1 day'),
('WEB003', CURRENT_DATE - INTERVAL '1 day', true, CURRENT_TIMESTAMP - INTERVAL '1 day'),
('MOB001', CURRENT_DATE - INTERVAL '1 day', true, CURRENT_TIMESTAMP - INTERVAL '1 day'),
('MOB002', CURRENT_DATE - INTERVAL '1 day', true, CURRENT_TIMESTAMP - INTERVAL '1 day'),
('DS001', CURRENT_DATE - INTERVAL '1 day', false, CURRENT_TIMESTAMP - INTERVAL '1 day'),
('DS002', CURRENT_DATE - INTERVAL '1 day', true, CURRENT_TIMESTAMP - INTERVAL '1 day'),
('AI001', CURRENT_DATE - INTERVAL '1 day', true, CURRENT_TIMESTAMP - INTERVAL '1 day'),
('DEV001', CURRENT_DATE - INTERVAL '1 day', false, CURRENT_TIMESTAMP - INTERVAL '1 day'),
('STU001', CURRENT_DATE - INTERVAL '1 day', true, CURRENT_TIMESTAMP - INTERVAL '1 day');

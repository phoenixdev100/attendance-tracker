-- Database setup for SIH Attendance Tracker with Team Support

-- Create teams table
CREATE TABLE IF NOT EXISTS teams (
    id SERIAL PRIMARY KEY,
    team_id VARCHAR(20) UNIQUE NOT NULL,
    team_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add team_id column to students table if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='students' AND column_name='team_id') THEN
        ALTER TABLE students ADD COLUMN team_id VARCHAR(20) REFERENCES teams(team_id);
    END IF;
END $$;

-- Insert sample teams with mixed case names
INSERT INTO teams (team_id, team_name) VALUES 
('TEAM001', 'Alpha Team'),
('TEAM002', 'BETA TEAM'),
('TEAM003', 'gamma team'),
('TEAM004', 'Delta TEAM'),
('TEAM005', 'epsilon Team')
ON CONFLICT (team_id) DO NOTHING;

-- Insert sample students with team assignments and mixed case names
INSERT INTO students (system_id, name, team_id) VALUES 
-- Alpha Team
('STU001', 'John DOE', 'TEAM001'),
('STU002', 'jane smith', 'TEAM001'),
('STU003', 'Mike Johnson', 'TEAM001'),
('STU004', 'SARAH WILSON', 'TEAM001'),

-- Beta Team
('STU005', 'david brown', 'TEAM002'),
('STU006', 'Lisa DAVIS', 'TEAM002'),
('STU007', 'CHRIS ANDERSON', 'TEAM002'),
('STU008', 'emma taylor', 'TEAM002'),

-- Gamma Team
('STU009', 'Alex Martinez', 'TEAM003'),
('STU010', 'RACHEL GREEN', 'TEAM003'),
('STU011', 'tom wilson', 'TEAM003'),

-- Delta Team
('STU012', 'Kevin LEE', 'TEAM004'),
('STU013', 'amy chen', 'TEAM004'),
('STU014', 'Robert KIM', 'TEAM004'),

-- Epsilon Team
('STU015', 'JESSICA WANG', 'TEAM005'),
('STU016', 'daniel park', 'TEAM005'),
('STU017', 'Maria GARCIA', 'TEAM005')
ON CONFLICT (system_id) DO UPDATE SET 
    name = EXCLUDED.name,
    team_id = EXCLUDED.team_id;

-- Update existing students without teams (assign them to teams)
UPDATE students SET team_id = 'TEAM001' WHERE system_id IN ('STU001', 'STU002', 'STU003', 'STU004') AND team_id IS NULL;
UPDATE students SET team_id = 'TEAM002' WHERE system_id IN ('STU005', 'STU006', 'STU007', 'STU008') AND team_id IS NULL;
UPDATE students SET team_id = 'TEAM003' WHERE system_id IN ('STU009', 'STU010', 'STU011') AND team_id IS NULL;
UPDATE students SET team_id = 'TEAM004' WHERE system_id IN ('STU012', 'STU013', 'STU014') AND team_id IS NULL;
UPDATE students SET team_id = 'TEAM005' WHERE system_id IN ('STU015', 'STU016', 'STU017') AND team_id IS NULL;

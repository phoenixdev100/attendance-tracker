-- Migration script to add marked_by column to attendance table
-- Run this script to update your existing database

-- Add marked_by column to attendance table
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS marked_by INTEGER REFERENCES users(id) ON DELETE SET NULL;

-- Create index for better performance on marked_by queries
CREATE INDEX IF NOT EXISTS idx_attendance_marked_by ON attendance(marked_by);

SELECT 'Migration completed successfully!' as status;

const express = require('express');
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config();
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const XLSX = require('xlsx');

const app = express();
const port = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP for development
}));

// CORS configuration for React development
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? false // In production, same origin
    : ['http://localhost:3001', 'http://localhost:3000'], // React dev server ports
  credentials: true
};
app.use(cors(corsOptions));

// Configure trust proxy for rate limiting
app.set('trust proxy', 1);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // Skip rate limiting for localhost in development
  skip: (req) => {
    if (process.env.NODE_ENV !== 'production') {
      return req.ip === '127.0.0.1' || req.ip === '::1' || req.ip === '::ffff:127.0.0.1';
    }
    return false;
  }
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json());

// PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Test database connection
pool.connect((err, client, release) => {
  if (err) {
    console.error('Error connecting to the database:', err);
    process.exit(1);
  }
  console.log('Connected to PostgreSQL database');
  release();
});

// Helper function to get today's date in YYYY-MM-DD format
const getTodayDate = () => {
  const today = new Date();
  return today.toISOString().split('T')[0];
};

// Initialize database with teams and sample data
const initializeDatabase = async () => {
  try {
    // Create teams table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS teams (
        id SERIAL PRIMARY KEY,
        team_id VARCHAR(20) UNIQUE NOT NULL,
        team_name VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add team_id column to students table if it doesn't exist
    await pool.query(`
      DO $$ 
      BEGIN 
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                         WHERE table_name='students' AND column_name='team_id') THEN
              ALTER TABLE students ADD COLUMN team_id VARCHAR(20) REFERENCES teams(team_id);
          END IF;
      END $$;
    `);

    // Insert sample teams with mixed case names
    await pool.query(`
      INSERT INTO teams (team_id, team_name) VALUES 
      ('TEAM001', 'Alpha Team'),
      ('TEAM002', 'BETA TEAM'),
      ('TEAM003', 'gamma team'),
      ('TEAM004', 'Delta TEAM'),
      ('TEAM005', 'epsilon Team')
      ON CONFLICT (team_id) DO NOTHING
    `);

    // Insert sample students with team assignments and mixed case names
    await pool.query(`
      INSERT INTO students (system_id, name, team_id) VALUES 
      ('STU001', 'John DOE', 'TEAM001'),
      ('STU002', 'jane smith', 'TEAM001'),
      ('STU003', 'Mike Johnson', 'TEAM001'),
      ('STU004', 'SARAH WILSON', 'TEAM001'),
      ('STU005', 'david brown', 'TEAM002'),
      ('STU006', 'Lisa DAVIS', 'TEAM002'),
      ('STU007', 'CHRIS ANDERSON', 'TEAM002'),
      ('STU008', 'emma taylor', 'TEAM002'),
      ('STU009', 'Alex Martinez', 'TEAM003'),
      ('STU010', 'RACHEL GREEN', 'TEAM003'),
      ('STU011', 'tom wilson', 'TEAM003'),
      ('STU012', 'Kevin LEE', 'TEAM004'),
      ('STU013', 'amy chen', 'TEAM004'),
      ('STU014', 'Robert KIM', 'TEAM004'),
      ('STU015', 'JESSICA WANG', 'TEAM005'),
      ('STU016', 'daniel park', 'TEAM005'),
      ('STU017', 'Maria GARCIA', 'TEAM005')
      ON CONFLICT (system_id) DO UPDATE SET 
        name = EXCLUDED.name,
        team_id = EXCLUDED.team_id
    `);

    console.log('Database initialized with teams and sample data');
  } catch (error) {
    console.error('Error initializing database:', error);
  }
};

// Initialize database on startup
initializeDatabase();

// Handle React routing - serve React app for non-API routes
if (process.env.NODE_ENV === 'production') {
  // Serve React build files
  app.use(express.static(path.join(__dirname, 'client/build')));
  
  // Handle React routing - catch all non-API routes
  app.get('*', (req, res) => {
    // Don't serve React for API routes
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ success: false, message: 'API endpoint not found' });
    }
    res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
  });
} else {
  // Development mode - just handle API routes
  app.get('/', (req, res) => {
    res.json({ 
      message: 'Attendance Tracker API Server', 
      mode: 'development',
      frontend: 'Run "npm run client" to start React development server on port 3001'
    });
  });
}

// API endpoint to mark a student present
app.post('/api/mark-present', async (req, res) => {
  const { systemId, teamId } = req.body;

  // Input validation - must have either systemId or teamId
  if ((!systemId && !teamId) || 
      (systemId && typeof systemId !== 'string') || 
      (teamId && typeof teamId !== 'string')) {
    return res.status(400).json({ 
      success: false, 
      message: 'Either System ID or Team ID is required and must be a non-empty string' 
    });
  }

  const trimmedSystemId = systemId ? systemId.trim().toUpperCase() : null;
  const trimmedTeamId = teamId ? teamId.trim().toUpperCase() : null;
  const today = getTodayDate();

  try {
    // Start a transaction
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      let studentsToMark = [];
      let isTeamAttendance = false;

      if (trimmedSystemId) {
        // Mark individual student by system ID
        const studentQuery = 'SELECT system_id, name, team_id FROM students WHERE system_id = $1';
        const studentResult = await client.query(studentQuery, [trimmedSystemId]);

        if (studentResult.rows.length === 0) {
          await client.query('ROLLBACK');
          return res.status(404).json({ 
            success: false, 
            message: `Student with ID "${trimmedSystemId}" not found. Please verify the system ID and try again.`,
            invalidId: trimmedSystemId
          });
        }

        studentsToMark = studentResult.rows;
      } else if (trimmedTeamId) {
        // Mark all students in the team
        const teamQuery = `
          SELECT s.system_id, s.name, s.team_id, t.team_name 
          FROM students s 
          JOIN teams t ON s.team_id = t.team_id 
          WHERE UPPER(t.team_id) = $1
        `;
        const teamResult = await client.query(teamQuery, [trimmedTeamId]);

        if (teamResult.rows.length === 0) {
          await client.query('ROLLBACK');
          return res.status(404).json({ 
            success: false, 
            message: `Team with ID "${trimmedTeamId}" not found or has no students`,
            invalidId: trimmedTeamId
          });
        }

        studentsToMark = teamResult.rows;
        isTeamAttendance = true;
      }

      // Process attendance for all students
      let markedStudents = [];
      let alreadyPresentStudents = [];
      let updatedStudents = [];

      for (const student of studentsToMark) {
        // Check if attendance already marked for today
        const attendanceCheckQuery = `
          SELECT id, present FROM attendance 
          WHERE student_id = $1 AND date = $2
        `;
        const attendanceCheckResult = await client.query(attendanceCheckQuery, [student.system_id, today]);

        if (attendanceCheckResult.rows.length > 0) {
          const existingRecord = attendanceCheckResult.rows[0];
          if (existingRecord.present) {
            alreadyPresentStudents.push(student);
          } else {
            // Update existing record to present
            const updateQuery = `
              UPDATE attendance 
              SET present = true, recorded_at = CURRENT_TIMESTAMP 
              WHERE student_id = $1 AND date = $2
            `;
            await client.query(updateQuery, [student.system_id, today]);
            updatedStudents.push(student);
          }
        } else {
          // Insert new attendance record
          const insertQuery = `
            INSERT INTO attendance (student_id, date, present, recorded_at) 
            VALUES ($1, $2, true, CURRENT_TIMESTAMP)
          `;
          await client.query(insertQuery, [student.system_id, today]);
          markedStudents.push(student);
        }
      }

      await client.query('COMMIT');

      // Prepare response message
      const totalProcessed = markedStudents.length + updatedStudents.length;
      const totalAlreadyPresent = alreadyPresentStudents.length;
      
      let message;
      if (isTeamAttendance) {
        const teamName = studentsToMark[0].team_name;
        if (totalProcessed > 0) {
          message = `Team ${teamName}: ${totalProcessed} student(s) marked present successfully!`;
          if (totalAlreadyPresent > 0) {
            message += ` ${totalAlreadyPresent} student(s) were already present.`;
          }
        } else {
          message = `Team ${teamName}: All ${totalAlreadyPresent} student(s) were already marked present today.`;
        }
      } else {
        const student = studentsToMark[0];
        if (totalProcessed > 0) {
          message = `${student.name} marked present successfully!`;
        } else {
          message = `${student.name} is already marked present for today. No changes made.`;
        }
      }

      res.json({ 
        success: true, 
        message: message,
        isTeamAttendance: isTeamAttendance,
        studentsMarked: [...markedStudents, ...updatedStudents],
        alreadyPresent: alreadyPresentStudents,
        totalProcessed: totalProcessed,
        date: today
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Error marking attendance:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error. Please try again later.' 
    });
  }
});

// API endpoint to get today's attendance statistics
app.get('/api/today-stats', async (req, res) => {
  const today = getTodayDate();

  try {
    // Get total number of students
    const totalQuery = 'SELECT COUNT(*) as total FROM students';
    const totalResult = await pool.query(totalQuery);
    const total = parseInt(totalResult.rows[0].total);

    // Get present count for today
    const presentQuery = `
      SELECT COUNT(*) as present 
      FROM attendance 
      WHERE date = $1 AND present = true
    `;
    const presentResult = await pool.query(presentQuery, [today]);
    const present = parseInt(presentResult.rows[0].present);

    // Get list of present students with details
    const presentStudentsQuery = `
      SELECT s.system_id, s.name, a.recorded_at
      FROM students s
      INNER JOIN attendance a ON s.system_id = a.student_id
      WHERE a.date = $1 AND a.present = true
      ORDER BY a.recorded_at ASC
    `;
    const presentStudentsResult = await pool.query(presentStudentsQuery, [today]);

    // Calculate absent count
    const absent = total - present;

    res.json({
      date: today,
      total: total,
      present: present,
      absent: absent,
      presentStudents: presentStudentsResult.rows
    });

  } catch (error) {
    console.error('Error fetching today\'s stats:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error. Please try again later.' 
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// API endpoint to get team members
app.get('/api/team/:teamId', async (req, res) => {
  const { teamId } = req.params;

  if (!teamId || typeof teamId !== 'string') {
    return res.status(400).json({ 
      success: false, 
      message: 'Team ID is required' 
    });
  }

  const trimmedTeamId = teamId.trim().toUpperCase();
  const today = getTodayDate();

  try {
    // Get team info and members with today's attendance status
    const query = `
      SELECT 
        t.team_id,
        t.team_name,
        s.system_id,
        s.name as student_name,
        COALESCE(a.present, false) as is_present_today,
        a.recorded_at
      FROM teams t
      LEFT JOIN students s ON t.team_id = s.team_id
      LEFT JOIN attendance a ON s.system_id = a.student_id AND a.date = $1
      WHERE UPPER(t.team_id) = $2
      ORDER BY s.system_id ASC
    `;
    
    const result = await pool.query(query, [today, trimmedTeamId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: `Team with ID "${trimmedTeamId}" not found` 
      });
    }

    // Check if team has no students
    if (result.rows[0].system_id === null) {
      return res.json({
        success: true,
        team: {
          teamId: result.rows[0].team_id,
          teamName: result.rows[0].team_name
        },
        members: [],
        message: 'Team found but has no members assigned'
      });
    }

    const teamInfo = {
      teamId: result.rows[0].team_id,
      teamName: result.rows[0].team_name
    };

    const members = result.rows.map(row => ({
      systemId: row.system_id,
      name: row.student_name,
      isPresentToday: row.is_present_today,
      recordedAt: row.recorded_at
    }));

    res.json({
      success: true,
      team: teamInfo,
      members: members,
      totalMembers: members.length,
      presentCount: members.filter(m => m.isPresentToday).length
    });

  } catch (error) {
    console.error('Error fetching team members:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error. Please try again later.' 
    });
  }
});

// API endpoint to get individual student details
app.get('/api/student/:systemId', async (req, res) => {
  const { systemId } = req.params;

  if (!systemId || typeof systemId !== 'string') {
    return res.status(400).json({ 
      success: false, 
      message: 'System ID is required' 
    });
  }

  const trimmedSystemId = systemId.trim().toUpperCase();
  const today = getTodayDate();

  try {
    // Get student info with today's attendance status and team info
    const query = `
      SELECT 
        s.system_id,
        s.name,
        s.team_id,
        t.team_name,
        COALESCE(a.present, false) as is_present_today,
        a.recorded_at
      FROM students s
      LEFT JOIN teams t ON s.team_id = t.team_id
      LEFT JOIN attendance a ON s.system_id = a.student_id AND a.date = $1
      WHERE UPPER(s.system_id) = $2
    `;
    
    const result = await pool.query(query, [today, trimmedSystemId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: `Student with ID "${systemId}" not found` 
      });
    }

    const student = result.rows[0];

    res.json({
      success: true,
      student: {
        systemId: student.system_id,
        name: student.name,
        teamId: student.team_id,
        teamName: student.team_name,
        isPresentToday: student.is_present_today,
        recordedAt: student.recorded_at
      }
    });

  } catch (error) {
    console.error('Error fetching student details:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error. Please try again later.' 
    });
  }
});

// API endpoint for batch attendance marking (team attendance with individual selection)
app.post('/api/mark-team-attendance', async (req, res) => {
  const { teamId, selectedStudents } = req.body;

  // Input validation
  if (!teamId || !Array.isArray(selectedStudents)) {
    return res.status(400).json({ 
      success: false, 
      message: 'Team ID and selected students array are required' 
    });
  }

  const trimmedTeamId = teamId.trim().toUpperCase();
  const today = getTodayDate();

  try {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Verify team exists and get all team members
      const teamQuery = `
        SELECT s.system_id, s.name 
        FROM students s 
        JOIN teams t ON s.team_id = t.team_id 
        WHERE UPPER(t.team_id) = $1
      `;
      const teamResult = await client.query(teamQuery, [trimmedTeamId]);

      if (teamResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ 
          success: false, 
          message: `Team with ID "${trimmedTeamId}" not found or has no students` 
        });
      }

      const allTeamMembers = teamResult.rows;
      let markedPresent = [];
      let markedAbsent = [];
      let errors = [];

      // Process each team member
      for (const member of allTeamMembers) {
        const isSelected = selectedStudents.includes(member.system_id);
        
        try {
          // Check if attendance record exists for today
          const checkQuery = `
            SELECT id, present FROM attendance 
            WHERE student_id = $1 AND date = $2
          `;
          const checkResult = await client.query(checkQuery, [member.system_id, today]);

          if (checkResult.rows.length > 0) {
            // Update existing record
            const updateQuery = `
              UPDATE attendance 
              SET present = $1, recorded_at = CURRENT_TIMESTAMP 
              WHERE student_id = $2 AND date = $3
            `;
            await client.query(updateQuery, [isSelected, member.system_id, today]);
          } else {
            // Insert new record
            const insertQuery = `
              INSERT INTO attendance (student_id, date, present, recorded_at) 
              VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
            `;
            await client.query(insertQuery, [member.system_id, today, isSelected]);
          }

          if (isSelected) {
            markedPresent.push(member);
          } else {
            markedAbsent.push(member);
          }
        } catch (error) {
          errors.push({ student: member, error: error.message });
        }
      }

      await client.query('COMMIT');

      res.json({
        success: true,
        message: `Team attendance updated: ${markedPresent.length} present, ${markedAbsent.length} absent`,
        teamId: trimmedTeamId,
        markedPresent: markedPresent,
        markedAbsent: markedAbsent,
        errors: errors,
        date: today
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Error marking team attendance:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error. Please try again later.' 
    });
  }
});

// API endpoint to mark a student absent (undo attendance)
app.post('/api/mark-absent', async (req, res) => {
  const { systemId, teamId } = req.body;

  // Input validation - must have either systemId or teamId
  if ((!systemId && !teamId) || 
      (systemId && typeof systemId !== 'string') || 
      (teamId && typeof teamId !== 'string')) {
    return res.status(400).json({ 
      success: false, 
      message: 'Either System ID or Team ID is required and must be a non-empty string' 
    });
  }

  const trimmedSystemId = systemId ? systemId.trim().toUpperCase() : null;
  const trimmedTeamId = teamId ? teamId.trim() : null;
  const today = getTodayDate();

  try {
    // Check if student exists
    const studentQuery = 'SELECT * FROM students WHERE UPPER(system_id) = $1';
    const studentResult = await pool.query(studentQuery, [trimmedSystemId]);
    
    if (studentResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: `Student with ID "${trimmedSystemId}" not found in the system` 
      });
    }

    const student = studentResult.rows[0];

    // Check if student has attendance record for today
    const attendanceQuery = 'SELECT * FROM attendance WHERE student_id = $1 AND date = $2';
    const attendanceResult = await pool.query(attendanceQuery, [student.system_id, today]);

    if (attendanceResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: `No attendance record found for ${student.name} (${student.system_id}) today` 
      });
    }

    const attendanceRecord = attendanceResult.rows[0];

    if (!attendanceRecord.present) {
      return res.status(409).json({ 
        success: false, 
        message: `${student.name} (${student.system_id}) is already marked as absent today` 
      });
    }

    // Update attendance to absent
    const updateQuery = `
      UPDATE attendance 
      SET present = false, recorded_at = CURRENT_TIMESTAMP 
      WHERE student_id = $1 AND date = $2
    `;
    await pool.query(updateQuery, [student.system_id, today]);

    res.json({
      success: true,
      message: `${student.name} has been marked as absent for today`,
      student: {
        systemId: student.system_id,
        name: student.name
      },
      date: today,
      status: 'absent'
    });

  } catch (error) {
    console.error('Error marking student absent:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error. Please try again later.' 
    });
  }
});

// API endpoint to export attendance records to Excel
app.get('/api/export-excel', async (req, res) => {
  try {
    // Get all attendance records with student and team details
    const query = `
      SELECT 
        s.system_id,
        s.name,
        s.team_id,
        t.team_name,
        a.date,
        a.present,
        a.recorded_at
      FROM students s
      LEFT JOIN teams t ON s.team_id = t.team_id
      LEFT JOIN attendance a ON s.system_id = a.student_id
      ORDER BY s.team_id ASC, s.system_id ASC, a.date DESC
    `;
    
    const result = await pool.query(query);
    
    // Transform data for Excel with serial number
    const excelData = result.rows.map((row, index) => ({
      'S.No': index + 1,
      'Team ID': row.team_id || 'No Team',
      'Team Name': row.team_name || 'No Team',
      'System ID': row.system_id,
      'Student Name': row.name,
      'Date': row.date ? new Date(row.date + 'T00:00:00').toLocaleDateString('en-US') : 'No Record',
      'Status': row.present === null ? 'No Record' : (row.present ? 'Present' : 'Absent'),
      'Recorded At': row.recorded_at ? new Date(row.recorded_at).toLocaleString('en-US') : 'N/A'
    }));

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);

    // Set column widths
    ws['!cols'] = [
      { wch: 8 },  // S.No
      { wch: 12 }, // Team ID
      { wch: 20 }, // Team Name
      { wch: 12 }, // System ID
      { wch: 25 }, // Student Name
      { wch: 12 }, // Date
      { wch: 10 }, // Status
      { wch: 22 }  // Recorded At
    ];

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Attendance Records');

    // Generate buffer
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // Set headers for file download
    const filename = `attendance_records_${new Date().toISOString().split('T')[0]}.xlsx`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

    // Send file
    res.send(buffer);

  } catch (error) {
    console.error('Error exporting to Excel:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error generating Excel file. Please try again later.' 
    });
  }
});

// 404 handler for API routes (must be after all API endpoints)
app.use('/api/*', (req, res) => {
  res.status(404).json({ success: false, message: 'API endpoint not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    success: false, 
    message: 'Internal server error' 
  });
});

// Start server
app.listen(port, () => {
  console.log(`Attendance tracker server running on port ${port}`);
  console.log(`Access the app at: http://localhost:${port}`);
});

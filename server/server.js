process.env.TZ = 'Asia/Kolkata';

const express = require('express');
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config();
const helmet = require('helmet');
const cors = require('cors');
const ExcelJS = require('exceljs');
const multer = require('multer');
const os = require('os');
const upload = multer({
  dest: process.env.VERCEL || process.env.NODE_ENV === 'production'
    ? os.tmpdir()
    : path.join(__dirname, 'uploads/')
});

const app = express();
const port = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP for development
}));

// CORS configuration for React development and production
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? [
    'https://orbito.space',
    process.env.CORS_ORIGIN
  ].filter(Boolean) // Remove any undefined values
  : [
    'http://localhost:3001',
    'http://localhost:3000',
    process.env.CORS_ORIGIN
  ].filter(Boolean);

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, Postman)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Length', 'X-Request-Id'],
  maxAge: 86400 // 24 hours
};

app.use(cors(corsOptions));

// Explicitly handle OPTIONS requests for all routes
app.options('*', cors(corsOptions));

// Body parsing middleware
app.use(express.json());

// PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 50, // Increase max connections for concurrent users
  idleTimeoutMillis: 30000, // Close idle connections after 30s
  connectionTimeoutMillis: 2000, // Timeout after 2s if can't connect
});

// Set timezone to Asia/Kolkata for all new DB connections
pool.on('connect', (client) => {
  client.query('SET TIME ZONE \'Asia/Kolkata\'');
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
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
};

// Initialize database with teams and sample data
const initializeDatabase = async () => {
  try {
    // Create users table for authentication
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'user')),
        name VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP
      )
    `);

    // Create students table (without team_id - will use junction table)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS students (
        id SERIAL,
        system_id VARCHAR(20) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        dept VARCHAR(100) NOT NULL,
        section VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create teams table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS teams (
        id SERIAL PRIMARY KEY,
        team_id VARCHAR(20) UNIQUE NOT NULL,
        team_name VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create student_teams junction table for many-to-many relationship
    await pool.query(`
      CREATE TABLE IF NOT EXISTS student_teams (
        id SERIAL PRIMARY KEY,
        student_id VARCHAR(20) REFERENCES students(system_id) ON DELETE CASCADE,
        team_id VARCHAR(20) REFERENCES teams(team_id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(student_id, team_id)
      )
    `);

    // Create attendance table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS attendance (
        id SERIAL PRIMARY KEY,
        student_id VARCHAR(20) REFERENCES students(system_id) ON DELETE CASCADE,
        date DATE NOT NULL,
        present BOOLEAN DEFAULT false,
        recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        marked_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        UNIQUE(student_id, date)
      )
    `);

    // Create settings table for feature toggles
    await pool.query(`
      CREATE TABLE IF NOT EXISTS settings (
        id SERIAL PRIMARY KEY,
        setting_key VARCHAR(100) UNIQUE NOT NULL,
        setting_value TEXT NOT NULL,
        description TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Seed default settings if they don't exist
    const settingsCheck = await pool.query('SELECT COUNT(*) as count FROM settings WHERE setting_key = $1', ['team_feature_enabled']);

    if (parseInt(settingsCheck.rows[0].count) === 0) {
      await pool.query(`
        INSERT INTO settings (setting_key, setting_value, description) 
        VALUES ($1, $2, $3)
      `, ['team_feature_enabled', 'true', 'Enable/disable team attendance feature for regular users']);

      // console.log('✅ Default settings initialized');
    }

    const passcodeCheck = await pool.query('SELECT COUNT(*) as count FROM settings WHERE setting_key = $1', ['attendance_passcode']);

    if (parseInt(passcodeCheck.rows[0].count) === 0) {
      await pool.query(`
        INSERT INTO settings (setting_key, setting_value, description) 
        VALUES ($1, $2, $3)
      `, ['attendance_passcode', '', 'Daily passcode required for regular users to mark attendance']);
    }

    const passcodeExpiryCheck = await pool.query('SELECT COUNT(*) as count FROM settings WHERE setting_key = $1', ['attendance_passcode_expires_at']);

    if (parseInt(passcodeExpiryCheck.rows[0].count) === 0) {
      await pool.query(`
        INSERT INTO settings (setting_key, setting_value, description) 
        VALUES ($1, $2, $3)
      `, ['attendance_passcode_expires_at', '', 'Expiry timestamp for the daily attendance passcode']);
    }

    console.log('✅ Database initialized successfully');

  } catch (error) {
    console.error('Error initializing database:', error);
  }
};

// Initialize database on startup
initializeDatabase();

// Handle React routing - serve React app for non-API routes
// Handle React routing - serve React app for non-API routes
// SKIP this on Vercel serverless environment as frontend is deployed separately
if (process.env.NODE_ENV === 'production' && !process.env.VERCEL) {
  // Serve React build files (client is now at ../client from server directory)
  app.use(express.static(path.join(__dirname, '../client/build')));

  // Handle React routing - catch all non-API routes
  app.get('*', (req, res) => {
    // Don't serve React for API routes
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ success: false, message: 'API endpoint not found' });
    }
    res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
  });
} else {
  // Development mode or Vercel - just handle API routes and root
  app.get('/', (req, res) => {
    res.json({
      message: 'Attendance Tracker API is running',
      environment: process.env.NODE_ENV,
      platform: process.env.VERCEL ? 'Vercel' : 'Self-hosted'
    });
  });
}

app.get('/health', (req, res) => {
  res.json({
    message: 'Server is healthy',
    status: 'success',
    timestamp: new Date().toISOString(),
  });
});

// API endpoint for login
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;

  // Input validation
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Email and password are required'
    });
  }

  try {
    const bcrypt = require('bcryptjs');

    // Query database for user using email
    const userQuery = 'SELECT * FROM users WHERE email = $1';
    const result = await pool.query(userQuery, [email.toLowerCase()]);

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const user = result.rows[0];

    // Verify password using bcrypt
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Update last login timestamp
    await pool.query(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );

    // Generate token (in production, use proper JWT)
    const token = `token-${user.id}-${Date.now()}`;

    // Return user info (excluding password)
    const userResponse = {
      id: user.id,
      email: user.email,
      username: user.email,
      role: user.role,
      name: user.name
    };

    res.json({
      success: true,
      message: 'Login successful',
      user: userResponse,
      token: token
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error. Please try again later.'
    });
  }
});

// ==================== USER MANAGEMENT API ENDPOINTS ====================

// GET all users (admin only)
app.get('/api/users', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email AS username, role, name, created_at, last_login FROM users ORDER BY created_at DESC'
    );

    res.json({
      success: true,
      users: result.rows
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error. Please try again later.'
    });
  }
});

// GET single user by ID (admin only)
app.get('/api/users/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      'SELECT id, email AS username, role, name, created_at, last_login FROM users WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error. Please try again later.'
    });
  }
});

// POST create new user (admin only)
app.post('/api/users', async (req, res) => {
  const { username, password, role, name } = req.body;

  // Validation
  if (!username || !password || !role || !name) {
    return res.status(400).json({
      success: false,
      message: 'All fields are required: email, password, role, name'
    });
  }

  if (!['admin', 'user'].includes(role)) {
    return res.status(400).json({
      success: false,
      message: 'Role must be either "admin" or "user"'
    });
  }

  if (password.length < 6) {
    return res.status(400).json({
      success: false,
      message: 'Password must be at least 6 characters long'
    });
  }

  try {
    const bcrypt = require('bcryptjs');

    // Check if email already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [username.toLowerCase()]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Email already exists'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert new user
    const result = await pool.query(
      'INSERT INTO users (email, password, role, name) VALUES ($1, $2, $3, $4) RETURNING id, email AS username, role, name, created_at',
      [username.toLowerCase(), hashedPassword, role, name]
    );

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error. Please try again later.'
    });
  }
});

// PUT update user (admin only)
app.put('/api/users/:id', async (req, res) => {
  const { id } = req.params;
  const { username, password, role, name } = req.body;

  // Validation
  if (!username || !role || !name) {
    return res.status(400).json({
      success: false,
      message: 'Email, role, and name are required'
    });
  }

  if (!['admin', 'user'].includes(role)) {
    return res.status(400).json({
      success: false,
      message: 'Role must be either "admin" or "user"'
    });
  }

  if (password && password.length < 6) {
    return res.status(400).json({
      success: false,
      message: 'Password must be at least 6 characters long'
    });
  }

  try {
    const bcrypt = require('bcryptjs');

    // Check if user exists
    const existingUser = await pool.query('SELECT id FROM users WHERE id = $1', [id]);

    if (existingUser.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if new email conflicts with another user
    const usernameCheck = await pool.query(
      'SELECT id FROM users WHERE email = $1 AND id != $2',
      [username.toLowerCase(), id]
    );

    if (usernameCheck.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Email already exists'
      });
    }

    // Update user
    let query, params;

    if (password) {
      // Update with new password
      const hashedPassword = await bcrypt.hash(password, 10);
      query = 'UPDATE users SET email = $1, password = $2, role = $3, name = $4 WHERE id = $5 RETURNING id, email AS username, role, name, created_at, last_login';
      params = [username.toLowerCase(), hashedPassword, role, name, id];
    } else {
      // Update without changing password
      query = 'UPDATE users SET email = $1, role = $2, name = $3 WHERE id = $4 RETURNING id, email AS username, role, name, created_at, last_login';
      params = [username.toLowerCase(), role, name, id];
    }

    const result = await pool.query(query, params);

    res.json({
      success: true,
      message: 'User updated successfully',
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error. Please try again later.'
    });
  }
});

// DELETE user (admin only)
app.delete('/api/users/:id', async (req, res) => {
  const { id } = req.params;

  try {
    // Check if user exists
    const existingUser = await pool.query('SELECT id, email AS username FROM users WHERE id = $1', [id]);

    if (existingUser.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prevent deleting the last admin
    const adminCount = await pool.query('SELECT COUNT(*) as count FROM users WHERE role = $1', ['admin']);
    const user = existingUser.rows[0];

    if (user.role === 'admin' && parseInt(adminCount.rows[0].count) <= 1) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete the last admin user'
      });
    }

    // Delete user
    await pool.query('DELETE FROM users WHERE id = $1', [id]);

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error. Please try again later.'
    });
  }
});

// ==================== SETTINGS API ENDPOINTS ====================

// GET settings (all users can read)
app.get('/api/settings', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM settings ORDER BY setting_key');

    // Convert to key-value object for easier frontend use
    const settings = {};
    result.rows.forEach(row => {
      if (row.setting_key === 'attendance_passcode') return;
      settings[row.setting_key] = {
        value: row.setting_value === 'true' ? true : row.setting_value === 'false' ? false : row.setting_value,
        description: row.description,
        updated_at: row.updated_at
      };
    });

    res.json({
      success: true,
      settings: settings
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error. Please try again later.'
    });
  }
});

// GET single setting by key
app.get('/api/settings/:key', async (req, res) => {
  const { key } = req.params;

  if (key === 'attendance_passcode') {
    return res.status(403).json({
      success: false,
      message: 'Forbidden'
    });
  }

  try {
    const result = await pool.query('SELECT * FROM settings WHERE setting_key = $1', [key]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Setting not found'
      });
    }

    const setting = result.rows[0];
    res.json({
      success: true,
      setting: {
        key: setting.setting_key,
        value: setting.setting_value === 'true' ? true : setting.setting_value === 'false' ? false : setting.setting_value,
        description: setting.description,
        updated_at: setting.updated_at
      }
    });
  } catch (error) {
    console.error('Error fetching setting:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error. Please try again later.'
    });
  }
});

// PUT update setting (admin only)
app.put('/api/settings/:key', async (req, res) => {
  const { key } = req.params;
  const { value } = req.body;

  if (value === undefined || value === null) {
    return res.status(400).json({
      success: false,
      message: 'Setting value is required'
    });
  }

  try {
    // Convert boolean to string for storage
    const stringValue = typeof value === 'boolean' ? value.toString() : value;

    const result = await pool.query(
      'UPDATE settings SET setting_value = $1, updated_at = CURRENT_TIMESTAMP WHERE setting_key = $2 RETURNING *',
      [stringValue, key]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Setting not found'
      });
    }

    const setting = result.rows[0];
    res.json({
      success: true,
      message: 'Setting updated successfully',
      setting: {
        key: setting.setting_key,
        value: setting.setting_value === 'true' ? true : setting.setting_value === 'false' ? false : setting.setting_value,
        description: setting.description,
        updated_at: setting.updated_at
      }
    });
  } catch (error) {
    console.error('Error updating setting:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error. Please try again later.'
    });
  }
});

// ==================== PASSCODE ENDPOINTS ====================

// POST validate attendance passcode
app.post('/api/validate-passcode', async (req, res) => {
  const { passcode } = req.body;

  if (!passcode || typeof passcode !== 'string') {
    return res.status(400).json({
      success: false,
      message: 'Passcode is required'
    });
  }

  try {
    const result = await pool.query(
      'SELECT setting_key, setting_value FROM settings WHERE setting_key IN ($1, $2)',
      ['attendance_passcode', 'attendance_passcode_expires_at']
    );

    const settings = {};
    result.rows.forEach(row => {
      settings[row.setting_key] = row.setting_value;
    });

    const currentPasscode = settings.attendance_passcode || '';

    if (!currentPasscode) {
      return res.json({
        success: true,
        valid: false,
        message: 'No passcode set'
      });
    }

    const expiresAt = settings.attendance_passcode_expires_at;
    const isExpired = expiresAt ? new Date() > new Date(expiresAt) : false;

    if (passcode.trim() !== currentPasscode) {
      return res.json({
        success: true,
        valid: false,
        message: 'Invalid passcode'
      });
    }

    if (isExpired) {
      return res.json({
        success: true,
        valid: false,
        message: 'Passcode expired'
      });
    }

    res.json({
      success: true,
      valid: true,
      message: 'Passcode valid',
      expiresAt: expiresAt
    });

  } catch (error) {
    console.error('Error validating passcode:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error. Please try again later.'
    });
  }
});

// GET current admin passcode
app.get('/api/admin/passcode', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT setting_key, setting_value, updated_at FROM settings WHERE setting_key IN ($1, $2)',
      ['attendance_passcode', 'attendance_passcode_expires_at']
    );

    const settings = {};
    result.rows.forEach(row => {
      settings[row.setting_key] = row;
    });

    const passcodeRow = settings.attendance_passcode;
    const expiresAtRow = settings.attendance_passcode_expires_at;

    if (!passcodeRow) {
      return res.json({
        success: true,
        passcode: ''
      });
    }

    const passcode = passcodeRow.setting_value;
    const expiresAt = expiresAtRow ? expiresAtRow.setting_value : null;
    const isExpired = expiresAt ? new Date() > new Date(expiresAt) : false;

    res.json({
      success: true,
      passcode: passcode,
      expiresAt: expiresAt,
      updatedAt: passcodeRow.updated_at,
      isExpired: isExpired
    });

  } catch (error) {
    console.error('Error fetching passcode:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error. Please try again later.'
    });
  }
});

// POST set admin passcode
app.post('/api/admin/passcode', async (req, res) => {
  const { passcode } = req.body;

  if (passcode === undefined || passcode === null) {
    return res.status(400).json({
      success: false,
      message: 'Passcode is required'
    });
  }

  try {
    const trimmedPasscode = passcode.toString().trim();
    const expiresAt = trimmedPasscode
      ? new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString()
      : '';

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        'UPDATE settings SET setting_value = $1, updated_at = CURRENT_TIMESTAMP WHERE setting_key = $2',
        [trimmedPasscode, 'attendance_passcode']
      );
      await client.query(
        'UPDATE settings SET setting_value = $1, updated_at = CURRENT_TIMESTAMP WHERE setting_key = $2',
        [expiresAt, 'attendance_passcode_expires_at']
      );
      await client.query('COMMIT');

      res.json({
        success: true,
        message: 'Passcode updated successfully',
        passcode: trimmedPasscode,
        expiresAt: expiresAt
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Error updating passcode:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error. Please try again later.'
    });
  }
});

// ==================== END SETTINGS ====================


// ==================== END USER MANAGEMENT ====================

// API endpoint to mark a student present
app.post('/api/mark-present', async (req, res) => {
  const { systemId, teamId, userId } = req.body;

  // Input validation - must have either systemId or teamId
  if ((!systemId && !teamId) ||
    (systemId && typeof systemId !== 'string') ||
    (teamId && typeof teamId !== 'string')) {
    return res.status(400).json({
      success: false,
      message: 'Either System ID or Team ID is required and must be a non-empty string'
    });
  }

  if (!userId || typeof userId !== 'number') {
    return res.status(400).json({
      success: false,
      message: 'User ID is required and must be a number'
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
        const studentQuery = 'SELECT system_id, name, dept FROM students WHERE system_id = $1';
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
          SELECT s.system_id, s.name, s.dept, t.team_id, t.team_name 
          FROM students s 
          JOIN student_teams st ON s.system_id = st.student_id
          JOIN teams t ON st.team_id = t.team_id 
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

      // Process attendance for all students using batch operations
      let markedStudents = [];
      let alreadyPresentStudents = [];
      let updatedStudents = [];

      // Get all existing attendance records for these students in one query
      const studentIds = studentsToMark.map(s => s.system_id);
      const existingAttendanceQuery = `
        SELECT student_id, present FROM attendance
        WHERE student_id = ANY($1) AND date = $2
      `;
      const existingAttendanceResult = await client.query(existingAttendanceQuery, [studentIds, today]);
      const existingRecords = new Map(
        existingAttendanceResult.rows.map(row => [row.student_id, row.present])
      );

      // Batch insert/update using UPSERT
      for (const student of studentsToMark) {
        const existingPresent = existingRecords.get(student.system_id);

        if (existingPresent === true) {
          alreadyPresentStudents.push(student);
        } else {
          // Use UPSERT to handle both insert and update in one query
          const upsertQuery = `
            INSERT INTO attendance (student_id, date, present, recorded_at, marked_by)
            VALUES ($1, $2, true, CURRENT_TIMESTAMP, $3)
            ON CONFLICT (student_id, date)
            DO UPDATE SET present = true, recorded_at = CURRENT_TIMESTAMP, marked_by = $3
          `;
          await client.query(upsertQuery, [student.system_id, today, userId]);

          if (existingPresent === false) {
            updatedStudents.push(student);
          } else {
            markedStudents.push(student);
          }
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
      SELECT s.system_id, s.name, s.dept, s.section, a.recorded_at, a.marked_by,
             u.email as marked_by_email, u.name as marked_by_name,
             STRING_AGG(DISTINCT t.team_id, ', ') as team_ids,
             STRING_AGG(DISTINCT t.team_name, ', ') as team_names
      FROM students s
      INNER JOIN attendance a ON s.system_id = a.student_id
      LEFT JOIN users u ON a.marked_by = u.id
      LEFT JOIN student_teams st ON s.system_id = st.student_id
      LEFT JOIN teams t ON st.team_id = t.team_id
      WHERE a.date = $1 AND a.present = true
      GROUP BY s.system_id, s.name, s.dept, s.section, a.recorded_at, a.marked_by, u.email, u.name
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

// Optimized endpoint for dashboard stats (counts only)
app.get('/api/today-stats-basic', async (req, res) => {
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

    // Calculate absent count
    const absent = total - present;

    res.json({
      date: today,
      total: total,
      present: present,
      absent: absent
    });

  } catch (error) {
    console.error('Error fetching today\'s basic stats:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error. Please try again later.'
    });
  }
});

// API endpoint to get user's marked students
app.get('/api/user-stats/:userId', async (req, res) => {
  const { userId } = req.params;
  const today = getTodayDate();

  try {
    // Get total number of students marked by this user today
    const totalQuery = `
      SELECT COUNT(*) as total 
      FROM attendance 
      WHERE marked_by = $1 AND date = $2 AND present = true
    `;
    const totalResult = await pool.query(totalQuery, [userId, today]);
    const total = parseInt(totalResult.rows[0].total);

    // Get list of students marked by this user today
    const markedStudentsQuery = `
      SELECT s.system_id, s.name, s.dept, s.section, a.recorded_at,
             STRING_AGG(DISTINCT t.team_id, ', ') as team_ids,
             STRING_AGG(DISTINCT t.team_name, ', ') as team_names
      FROM students s
      INNER JOIN attendance a ON s.system_id = a.student_id
      LEFT JOIN student_teams st ON s.system_id = st.student_id
      LEFT JOIN teams t ON st.team_id = t.team_id
      WHERE a.marked_by = $1 AND a.date = $2 AND a.present = true
      GROUP BY s.system_id, s.name, s.dept, s.section, a.recorded_at
      ORDER BY a.recorded_at ASC
    `;
    const markedStudentsResult = await pool.query(markedStudentsQuery, [userId, today]);

    res.json({
      date: today,
      total: total,
      markedStudents: markedStudentsResult.rows
    });

  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error. Please try again later.'
    });
  }
});

// API endpoint to upload Excel file with student data
app.post('/api/upload-students', upload.single('excelFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No Excel file uploaded'
      });
    }

    // Read the Excel file
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(req.file.path);
    const worksheet = workbook.worksheets[0];

    // Convert to JSON
    const data = [];
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header row
      const rowData = {};
      row.eachCell((cell, colNumber) => {
        const header = worksheet.getRow(1).getCell(colNumber).value;
        if (header) {
          rowData[header.toString().toLowerCase().replace(/\s+/g, '_')] = cell.value;
        }
      });
      if (Object.keys(rowData).length > 0) {
        data.push(rowData);
      }
    });

    if (data.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Excel file is empty or has no valid data'
      });
    }

    // Validate required columns
    const requiredColumns = ['system_id', 'name', 'dept', 'section', 'team_id'];
    const firstRow = data[0];
    const missingColumns = requiredColumns.filter(col => !(col in firstRow));

    if (missingColumns.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required columns: ${missingColumns.join(', ')}. Required: system_id, name, dept, section, team_id`
      });
    }

    // Validate every row before starting the transaction
    const missingFieldRows = [];
    data.forEach((row, index) => {
      const systemId = row.system_id?.toString().trim().toUpperCase();
      const name = row.name?.toString().trim();
      const dept = row.dept?.toString().trim();
      const section = row.section?.toString().trim();
      const teamId = row.team_id?.toString().trim().toUpperCase();

      if (!systemId || !name || !dept || !section || !teamId) {
        missingFieldRows.push({
          row: index + 2,
          data: row
        });
      }
    });

    if (missingFieldRows.length > 0) {
      // Clean up uploaded file
      const fs = require('fs');
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        console.error('Error cleaning up file:', cleanupError);
      }

      return res.status(400).json({
        success: false,
        message: 'Upload rejected. Some rows are missing required fields (system_id, name, dept, section, team_id).',
        invalidRows: missingFieldRows
      });
    }

    const client = await pool.connect();
    let insertedStudents = 0;
    let updatedStudents = 0;
    let errors = [];

    try {
      await client.query('BEGIN');

      for (const row of data) {
        try {
          const systemId = row.system_id?.toString().trim().toUpperCase();
          const name = row.name?.toString().trim();
          const dept = row.dept?.toString().trim();
          const section = row.section?.toString().trim();
          const teamId = row.team_id?.toString().trim().toUpperCase();

          // Check if student exists
          const existingStudent = await client.query(
            'SELECT system_id FROM students WHERE UPPER(system_id) = $1',
            [systemId]
          );

          if (existingStudent.rows.length > 0) {
            // Update existing student
            await client.query(
              'UPDATE students SET name = $1, dept = $2, section = $3 WHERE UPPER(system_id) = $4',
              [name, dept, section, systemId]
            );
            updatedStudents++;
          } else {
            // Insert new student
            await client.query(
              'INSERT INTO students (system_id, name, dept, section) VALUES ($1, $2, $3, $4)',
              [systemId, name, dept, section]
            );
            insertedStudents++;
          }

          // Create team and student-team relationship if team_id is provided
          if (teamId) {
            await client.query(
              'INSERT INTO teams (team_id, team_name) VALUES ($1, $2) ON CONFLICT (team_id) DO NOTHING',
              [teamId, `Team ${teamId}`]
            );
            await client.query(
              'INSERT INTO student_teams (student_id, team_id) VALUES ($1, $2) ON CONFLICT (student_id, team_id) DO NOTHING',
              [systemId, teamId]
            );
          }
        } catch (rowError) {
          errors.push(`Error processing row: ${JSON.stringify(row)} - ${rowError.message}`);
        }
      }

      await client.query('COMMIT');

      // Clean up uploaded file
      const fs = require('fs');
      fs.unlinkSync(req.file.path);

      res.json({
        success: true,
        message: `Excel upload completed successfully!`,
        summary: {
          totalRows: data.length,
          inserted: insertedStudents,
          updated: updatedStudents,
          errors: errors.length
        },
        errors: errors.length > 0 ? errors : undefined
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Error uploading Excel file:', error);

    // Clean up uploaded file on error
    if (req.file) {
      const fs = require('fs');
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        console.error('Error cleaning up file:', cleanupError);
      }
    }

    res.status(500).json({
      success: false,
      message: 'Error processing Excel file. Please check the format and try again.',
      error: error.message
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
        s.dept,
        s.section,
        COALESCE(a.present, false) as is_present_today,
        a.recorded_at
      FROM teams t
      LEFT JOIN student_teams st ON t.team_id = st.team_id
      LEFT JOIN students s ON st.student_id = s.system_id
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
          team_id: result.rows[0].team_id,
          team_name: result.rows[0].team_name
        },
        members: [],
        message: 'Team found but has no members assigned'
      });
    }

    const teamInfo = {
      team_id: result.rows[0].team_id,
      team_name: result.rows[0].team_name
    };

    const members = result.rows.map(row => ({
      systemId: row.system_id,
      name: row.student_name,
      dept: row.dept,
      section: row.section,
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
        s.dept,
        s.section,
        STRING_AGG(DISTINCT t.team_id, ', ') as team_ids,
        STRING_AGG(DISTINCT t.team_name, ', ') as team_names,
        COALESCE(a.present, false) as is_present_today,
        a.recorded_at
      FROM students s
      LEFT JOIN student_teams st ON s.system_id = st.student_id
      LEFT JOIN teams t ON st.team_id = t.team_id
      LEFT JOIN attendance a ON s.system_id = a.student_id AND a.date = $1
      WHERE UPPER(s.system_id) = $2
      GROUP BY s.system_id, s.name, s.dept, s.section, a.present, a.recorded_at
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
        team_ids: student.team_ids,
        dept: student.dept,
        section: student.section,
        team_names: student.team_names,
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
  const { teamId, selectedStudents, userId } = req.body;

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
        SELECT s.system_id, s.name, s.dept 
        FROM students s 
        JOIN student_teams st ON s.system_id = st.student_id
        JOIN teams t ON st.team_id = t.team_id 
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

      // Get all existing attendance records for team members in one query
      const studentIds = allTeamMembers.map(m => m.system_id);
      const existingAttendanceQuery = `
        SELECT student_id, present FROM attendance
        WHERE student_id = ANY($1) AND date = $2
      `;
      const existingAttendanceResult = await client.query(existingAttendanceQuery, [studentIds, today]);
      const existingRecords = new Map(
        existingAttendanceResult.rows.map(row => [row.student_id, row.present])
      );

      // Process each team member using batch operations
      for (const member of allTeamMembers) {
        const isSelected = selectedStudents.includes(member.system_id);

        try {
          // Use UPSERT to handle both insert and update in one query
          const upsertQuery = `
            INSERT INTO attendance (student_id, date, present, recorded_at, marked_by)
            VALUES ($1, $2, $3, CURRENT_TIMESTAMP, $4)
            ON CONFLICT (student_id, date)
            DO UPDATE SET present = $3, recorded_at = CURRENT_TIMESTAMP, marked_by = $4
          `;
          await client.query(upsertQuery, [member.system_id, today, isSelected, userId || null]);

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
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      let studentsToMarkAbsent = [];
      let isTeamOperation = false;

      if (trimmedSystemId) {
        // Mark individual student absent
        const studentQuery = 'SELECT system_id, name, dept FROM students WHERE UPPER(system_id) = $1';
        const studentResult = await client.query(studentQuery, [trimmedSystemId]);

        if (studentResult.rows.length === 0) {
          await client.query('ROLLBACK');
          return res.status(404).json({
            success: false,
            message: `Student with ID "${trimmedSystemId}" not found in the system`,
            invalidId: trimmedSystemId
          });
        }

        studentsToMarkAbsent = studentResult.rows;
      } else if (trimmedTeamId) {
        // Mark all students in team absent
        isTeamOperation = true;
        const teamQuery = `
          SELECT s.system_id, s.name, s.dept 
          FROM students s 
          JOIN student_teams st ON s.system_id = st.student_id
          JOIN teams t ON st.team_id = t.team_id 
          WHERE UPPER(t.team_id) = $1
        `;
        const teamResult = await client.query(teamQuery, [trimmedTeamId.toUpperCase()]);

        if (teamResult.rows.length === 0) {
          await client.query('ROLLBACK');
          return res.status(404).json({
            success: false,
            message: `Team with ID "${trimmedTeamId}" not found or has no students`
          });
        }

        studentsToMarkAbsent = teamResult.rows;
      }

      let markedCount = 0;
      let alreadyAbsentCount = 0;
      let noRecordCount = 0;
      const markedStudents = [];

      // Get all existing attendance records for these students in one query
      const studentIds = studentsToMarkAbsent.map(s => s.system_id);
      const existingAttendanceQuery = `
        SELECT student_id, present FROM attendance
        WHERE student_id = ANY($1) AND date = $2
      `;
      const existingAttendanceResult = await client.query(existingAttendanceQuery, [studentIds, today]);
      const existingRecords = new Map(
        existingAttendanceResult.rows.map(row => [row.student_id, row.present])
      );

      // Process each student using batch operations
      for (const student of studentsToMarkAbsent) {
        const existingPresent = existingRecords.get(student.system_id);

        if (existingPresent === undefined) {
          noRecordCount++;
          continue;
        }

        if (!existingPresent) {
          alreadyAbsentCount++;
          continue;
        }

        // Update attendance to absent
        const updateQuery = `
          UPDATE attendance
          SET present = false, recorded_at = CURRENT_TIMESTAMP
          WHERE student_id = $1 AND date = $2
        `;
        await client.query(updateQuery, [student.system_id, today]);

        markedCount++;
        markedStudents.push({
          systemId: student.system_id,
          name: student.name
        });
      }

      await client.query('COMMIT');

      // Prepare response message
      let message;
      if (isTeamOperation) {
        message = `Team ${trimmedTeamId}: ${markedCount} student(s) marked absent`;
        if (alreadyAbsentCount > 0) {
          message += `, ${alreadyAbsentCount} already absent`;
        }
        if (noRecordCount > 0) {
          message += `, ${noRecordCount} had no attendance record`;
        }
      } else {
        if (markedCount > 0) {
          message = `${studentsToMarkAbsent[0].name} has been marked as absent for today`;
        } else if (alreadyAbsentCount > 0) {
          message = `${studentsToMarkAbsent[0].name} is already marked as absent today`;
        } else {
          message = `No attendance record found for ${studentsToMarkAbsent[0].name} today`;
        }
      }

      res.json({
        success: true,
        message: message,
        markedCount: markedCount,
        alreadyAbsentCount: alreadyAbsentCount,
        noRecordCount: noRecordCount,
        students: markedStudents,
        date: today,
        status: 'absent'
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Error marking student(s) absent:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error. Please try again later.'
    });
  }
});

// API endpoint to export attendance records to Excel
app.get('/api/export-excel', async (req, res) => {
  try {
    const today = getTodayDate();

    // Get today's attendance records with student and team details
    const query = `
      WITH student_teams_agg AS (
        SELECT
          st.student_id,
          STRING_AGG(DISTINCT t.team_id, ', ') as team_ids,
          STRING_AGG(DISTINCT t.team_name, ', ') as team_names
        FROM student_teams st
        LEFT JOIN teams t ON st.team_id = t.team_id
        GROUP BY st.student_id
      )
      SELECT
        s.system_id,
        s.name,
        s.dept,
        s.section,
        sta.team_ids,
        sta.team_names,
        a.date,
        a.present,
        a.recorded_at
      FROM students s
      LEFT JOIN student_teams_agg sta ON s.system_id = sta.student_id
      LEFT JOIN attendance a ON s.system_id = a.student_id AND a.date = $1
      ORDER BY s.system_id ASC
    `;

    const result = await pool.query(query, [today]);

    // Transform data for Excel with serial number
    const excelData = result.rows.map((row, index) => ({
      s_no: index + 1,
      team_ids: row.team_ids || 'No Team',
      system_id: row.system_id,
      name: row.name,
      dept: row.dept || 'Not Set',
      section: row.section || 'Not Set',
      status: row.present === null ? 'No Record' : (row.present ? 'Present' : 'Absent'),
      recorded_at: row.recorded_at ? new Date(row.recorded_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'N/A'
    }));

    // Create workbook and worksheet
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Attendance Records');

    // Add columns
    ws.columns = [
      { header: 'S.No', key: 's_no', width: 8 },
      { header: 'Team IDs', key: 'team_ids', width: 15 },
      { header: 'System ID', key: 'system_id', width: 12 },
      { header: 'Student Name', key: 'name', width: 25 },
      { header: 'Department', key: 'dept', width: 30 },
      { header: 'Section', key: 'section', width: 15 },
      { header: 'Status', key: 'status', width: 10 },
      { header: 'Recorded At', key: 'recorded_at', width: 22 }
    ];

    // Add data
    ws.addRows(excelData);

    // Generate buffer
    const buffer = await wb.xlsx.writeBuffer();

    // Set headers for file download
    const filename = `attendance_records_${getTodayDate()}.xlsx`;
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
    message: 'Internal server error',
    error: err.message, // Temporary: expose error for debugging
    stack: process.env.NODE_ENV === 'production' ? '🥞' : err.stack
  });
});

// Start server if not running in serverless environment
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(port, () => {
    console.log(`Attendance tracker server running on port ${port}`);
  });
}

module.exports = app;

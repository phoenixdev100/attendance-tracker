# 📋 Attendance Tracker

A modern, secure **React + Node.js + Express + PostgreSQL** web application for tracking student attendance. Built with NeonDB integration, React frontend, and production-ready security features.

## ✨ Features

- **React Frontend**: Modern component-based UI with routing
- **Simple Attendance Marking**: Enter student system ID to mark present
- **Real-time Statistics**: View today's attendance statistics with visual progress bars
- **Secure & Production-Ready**: Rate limiting, input validation, SQL injection protection
- **Modern UI**: Responsive React components with smooth animations
- **PostgreSQL Integration**: Optimized for NeonDB with connection pooling
- **Development Mode**: Hot reload with React dev server
- **Production Ready**: Optimized builds and deployment

## 🏗️ Database Schema

The application uses two main tables:

### `students` table
- `system_id` (VARCHAR, PRIMARY KEY) - Unique student identifier
- `name` (VARCHAR, NOT NULL) - Student name

### `attendance` table
- `id` (SERIAL, PRIMARY KEY) - Auto-incrementing ID
- `student_id` (VARCHAR, FOREIGN KEY) - References students.system_id
- `date` (DATE, NOT NULL) - Attendance date
- `present` (BOOLEAN, NOT NULL) - Attendance status
- `recorded_at` (TIMESTAMP, DEFAULT NOW()) - When record was created
- **UNIQUE CONSTRAINT**: (student_id, date) - Prevents duplicate entries

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ installed
- NeonDB account and database created
- Basic knowledge of PostgreSQL and React

### 1. Clone and Install
```bash
# Navigate to project directory
cd attendance-tracker

# Install backend dependencies
npm install

# Install React frontend dependencies
npm run client-install
```

### 2. Database Setup
1. Create a NeonDB account at [neon.tech](https://neon.tech)
2. Create a new database
3. Run the following SQL to create tables:

```sql
-- Create students table
CREATE TABLE students (
    system_id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL
);

-- Create attendance table
CREATE TABLE attendance (
    id SERIAL PRIMARY KEY,
    student_id VARCHAR(50) NOT NULL,
    date DATE NOT NULL,
    present BOOLEAN NOT NULL DEFAULT false,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(system_id),
    UNIQUE(student_id, date)
);

-- Insert sample students (optional)
INSERT INTO students (system_id, name) VALUES 
('STU001', 'John Doe'),
('STU002', 'Jane Smith'),
('STU003', 'Mike Johnson'),
('STU004', 'Sarah Wilson'),
('STU005', 'David Brown');
```

### 3. Environment Configuration
1. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

2. Edit `.env` with your NeonDB credentials:
```env
DATABASE_URL=postgresql://username:password@ep-your-endpoint.region.aws.neon.tech/dbname?sslmode=require
PORT=3000
```

### 4. Run the Application

#### Development Mode (Recommended)
```bash
# Option 1: Run both servers simultaneously
npm run dev-full

# Option 2: Run servers separately
# Terminal 1 - Backend API Server
npm run dev

# Terminal 2 - React Frontend (in new terminal)
npm run client
```

**Development URLs:**
- React Frontend: `http://localhost:3001` (with hot reload)
- Backend API: `http://localhost:3000`

#### Production Mode
```bash
# Database will be initialized automatically when you start the server

# Set production environment (Windows)
set NODE_ENV=production

# Start production server
npm start
```

**Production URL:** `http://localhost:3000`

## 📱 Usage

### Mark Attendance
1. Go to `http://localhost:3000`
2. Enter a student's system ID
3. Click "Mark Present"
4. Receive confirmation with student name

### View Statistics
1. Click "View Today's Statistics" or go to `http://localhost:3000/stats`
2. See real-time attendance data:
   - Total students
   - Present count
   - Absent count
   - Attendance rate with visual progress bar

## 🔒 Security Features

- **Rate Limiting**: 100 requests per 15 minutes per IP
- **Input Validation**: Comprehensive server-side validation
- **SQL Injection Protection**: Parameterized queries only
- **CORS Protection**: Configurable cross-origin policies
- **Helmet.js**: Security headers and CSP
- **Transaction Safety**: Database operations in transactions

## 🛠️ API Endpoints

### `POST /api/mark-present`
Mark a student present for today.

**Request Body:**
```json
{
  "systemId": "STU001"
}
```

**Success Response:**
```json
{
  "success": true,
  "message": "John Doe marked present successfully!",
  "student": {
    "systemId": "STU001",
    "name": "John Doe"
  },
  "date": "2024-01-15"
}
```

### `GET /api/today-stats`
Get today's attendance statistics.

**Response:**
```json
{
  "date": "2024-01-15",
  "total": 5,
  "present": 3,
  "absent": 2
}
```

### `GET /api/health`
Health check endpoint.

**Response:**
```json
{
  "status": "OK",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## 🎨 Frontend Features

- **Responsive Design**: Works on desktop, tablet, and mobile
- **Real-time Updates**: Auto-refresh statistics every 30 seconds
- **Loading States**: Visual feedback during API calls
- **Error Handling**: User-friendly error messages
- **Accessibility**: Keyboard navigation and screen reader support

## 🔧 Development

### Project Structure
```
attendance-tracker/
├── server.js          # Main server file
├── index.html         # Attendance marking page
├── stats.html         # Statistics page
├── package.json       # Dependencies and scripts
├── .env.example       # Environment variables template
└── README.md          # This file
```

### Available Scripts
- `npm start` - Start production server
- `npm run dev` - Start development server with auto-restart

### Database Queries
All database operations use parameterized queries to prevent SQL injection:
```javascript
// Example: Safe query with parameters
const result = await pool.query(
  'SELECT * FROM students WHERE system_id = $1', 
  [systemId]
);
```

## 🚀 Production Deployment

### Environment Variables
Set these in your production environment:
- `DATABASE_URL` - Your NeonDB connection string
- `PORT` - Server port (default: 3000)
- `NODE_ENV=production` - Enables production optimizations

### Recommended Settings
- Use a reverse proxy (nginx) for static file serving
- Enable SSL/HTTPS
- Set up monitoring and logging
- Configure database connection pooling
- Implement backup strategies

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

If you encounter any issues:
1. Check the console for error messages
2. Verify your database connection
3. Ensure all environment variables are set
4. Check that your NeonDB allows connections

For additional help, please create an issue in the repository.

---

Built with ❤️ using Node.js, Express, and PostgreSQL

# Authentication System - Attendance Tracker

## Overview
The attendance tracker now has a complete **database-backed** role-based authentication system with two user types:
- **Admin**: Full access to all features
- **User**: Limited access (attendance marking only)

## Database Schema

### Users Table
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,  -- bcrypt hashed
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'user')),
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP
);
```

## Demo Credentials

### Admin Account
- **Username**: `admin`
- **Password**: `admin123`
- **Access**: Full dashboard with statistics, Excel download, and all controls

### User Account
- **Username**: `user`
- **Password**: `user123`
- **Access**: Attendance marking only (no statistics or downloads)

## Security Features

✅ **Passwords are hashed using bcrypt** (salt rounds: 10)
✅ **Database-backed authentication** (PostgreSQL)
✅ **Last login tracking** (updates on each successful login)
✅ **Role-based access control** (admin/user roles)
✅ **Secure password verification** (bcrypt.compare)
✅ **SQL injection protection** (parameterized queries)

## Features by Role

### Admin Features
✅ View comprehensive dashboard with statistics
✅ See all present students
✅ Mark students absent from dashboard
✅ Download Excel reports
✅ Access attendance marking page
✅ View today's statistics
✅ Logout functionality
✅ Back button to return to admin dashboard

### User Features
✅ Mark attendance (individual or team)
✅ View student lookup details
✅ Logout functionality
❌ Cannot view statistics
❌ Cannot download Excel reports
❌ Cannot access admin dashboard

## Routes

### Public Routes
- `/login` - Login page (redirects if already logged in)

### Admin Routes (require admin role)
- `/admin` - Admin dashboard with full statistics
- `/attendance` - Attendance marking page (with back button to admin dashboard)
- `/stats` - Statistics page

### User Routes (require authentication)
- `/` - User dashboard (attendance marking only)

## How It Works

1. **Database Initialization**:
   - Creates `users` table on first run
   - Seeds demo admin and user accounts with hashed passwords
   - Displays credentials in console

2. **Login Flow**:
   - User enters credentials on `/login`
   - Backend queries database for username
   - Verifies password using bcrypt.compare()
   - Updates last_login timestamp
   - Returns user object (without password) and token
   - Stores in localStorage
   - Redirects based on role (admin → `/admin`, user → `/`)

3. **Protected Routes**:
   - App checks for user in localStorage on load
   - Routes check user role before rendering
   - Unauthorized access redirects to `/login`

4. **Logout**:
   - Clears localStorage
   - Redirects to `/login`

## Installation

The system automatically:
1. Creates the users table if it doesn't exist
2. Seeds demo users if the table is empty
3. Displays credentials in the console

**Required Package**: `bcryptjs` (automatically installed)

## API Endpoints

### POST /api/login
**Request:**
```json
{
  "username": "admin",
  "password": "admin123"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Login successful",
  "user": {
    "id": 1,
    "username": "admin",
    "role": "admin",
    "name": "Administrator"
  },
  "token": "token-1-1234567890"
}
```

**Response (Error):**
```json
{
  "success": false,
  "message": "Invalid username or password"
}
```

## Files Modified/Created

### Frontend
- `src/components/Login.js` - Login page component
- `src/components/AdminDashboard.js` - Admin dashboard with full features
- `src/components/UserDashboard.js` - User dashboard wrapper
- `src/components/AttendanceForm.js` - Updated to support role-based UI
- `src/App.js` - Complete rewrite with authentication and routing

### Backend
- `server/server.js` - Added:
  - Users table creation
  - Demo user seeding with bcrypt
  - `/api/login` endpoint with database authentication
  - Password verification using bcrypt
  - Last login tracking

### Dependencies
- `server/package.json` - Added `bcryptjs: ^2.4.3`

## Usage

1. Start the server: `npm run dev` (in server directory)
2. Start the client: `npm start` (in client directory)
3. Navigate to the login page (automatic redirect)
4. Use demo credentials to log in
5. Experience different dashboards based on role
6. Logout to switch accounts

## Production Recommendations

For production deployment:
- ✅ Already using bcrypt for password hashing
- ✅ Already using parameterized SQL queries
- ✅ Already using database-backed authentication
- 🔄 Consider implementing JWT tokens instead of simple tokens
- 🔄 Add refresh token mechanism
- 🔄 Implement session management
- 🔄 Add password reset functionality
- 🔄 Add user registration (if needed)
- 🔄 Add rate limiting on login endpoint
- 🔄 Add account lockout after failed attempts
- 🔄 Add audit logging for authentication events
- 🔄 Use environment variables for sensitive data

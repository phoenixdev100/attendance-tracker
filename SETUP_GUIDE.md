# 🛠️ Setup & Installation Guide

This guide provides detailed instructions on how to set up the Attendance Tracker locally for development.

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js**: v14.0.0 or higher ([Download](https://nodejs.org/))
- **npm**: v6.0.0 or higher (Usually bundles with Node.js)
- **PostgreSQL**: A running instance (Local or Cloud)
- **Git**: For version control

---

## 🏗️ Project Structure Setup

The project consists of two main folders:
- `client`: The React frontend application
- `server`: The Node.js/Express backend API

### 1. Clone the Repository
```bash
git clone <repository_url>
cd attendance-tracker
```

### 2. Backend Setup (Server)

Navigate to the server directory and install dependencies:
```bash
cd server
npm install
```

**Environment Variables:**
Create a `.env` file in the `server` directory with the following variables:

| Variable | Description | Example |
|----------|-------------|---------|
| `PORT` | The port the server will run on | `3000` |
| `DATABASE_URL` | PostgreSQL Connection String | `postgres://user:pass@host/db...` |
| `NODE_ENV` | Environment mode | `development` |
| `CORS_ORIGIN` | Allowed Frontend URL | `http://localhost:3001` |
| `jwtSecret` | Secret key for JWT signing | `mySuperSecretKey123` |

**Database Initialization:**
The server is configured to automatically create necessary tables on startup if they don't exist.

**Start the Server:**
```bash
# Development mode with nodemon (auto-restart on changes)
npm run dev

# Production start
npm start
```
*You should see "Server running on port 3000" and "Database initialized successfully" in the terminal.*

### 3. Frontend Setup (Client)

Open a new terminal, navigate to the client directory, and install dependencies:
```bash
cd client
npm install
```

**Environment Variables:**
Create a `.env` file in the `client` directory:

| Variable | Description | Example |
|----------|-------------|---------|
| `PORT` | The port the client will run on | `3001` |
| `REACT_APP_API_URL`| URL of your backend server | `http://localhost:3000` |

**Start the Client:**
```bash
npm start
```
*The application should now be accessible at `http://localhost:3001`.*

---

## 🧪 Testing the Application

1. **Login**: 
   - Visit `http://localhost:3001/login`
   - **Default Admin Credentials:**
     - Username: `admin`
     - Password: `admin123`
   - **Default User Credentials:**
     - Username: `user`
     - Password: `user123`

2. **Admin Dashboard**:
   - Access at `/admin`
   - Try toggling features in Settings
   - Try creating a new user

3. **Attendance**:
   - Access at `/attendance`
   - Try looking up a student ID (if you seeded data)

---

## 🆘 Troubleshooting

**Q: Client cannot connect to Server (Network Error)**
- Check if the Server is running.
- Verify `REACT_APP_API_URL` in `client/.env` matches the Server's URL.

**Q: CORS Error in Browser Console**
- Verify `CORS_ORIGIN` in `server/.env` matches your Client's URL (e.g., `http://localhost:3001`).

**Q: Database Connection Error**
- Check your `DATABASE_URL`. Ensure your IP is whitelisted if using a cloud database like Neon or Supabase.

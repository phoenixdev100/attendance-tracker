# 🔧 Troubleshooting Guide

Common issues and solutions for the Attendance Tracker.

## 🌐 Connectivity Issues

### "Network Error" when logging in
**Cause**: The React client cannot reach the Node server.
- **Fix 1**: Ensure the server is running (`cd server && npm run dev`).
- **Fix 2**: Check `REACT_APP_API_URL` in `client/.env`. It usually should be `http://localhost:3000`.
- **Fix 3**: If on different devices, ensure you are using your machine's local IP (e.g., `192.168.x.x`) instead of `localhost`.

### "CORS Error" in Console
**Cause**: The server is blocking the request because the origin doesn't match the whitelist.
- **Fix**: Open `server/.env` and update `CORS_ORIGIN` to match your frontend URL (e.g., `http://localhost:3001`). Restart the server.

---

## 💾 Database Issues

### "relation 'users' does not exist"
**Cause**: The database tables haven't been created yet.
- **Fix**: The server attempts to create tables on startup. Restart the server and watch the console logs for "Database initialized successfully". If it fails, check your `DATABASE_URL`.

### "password authentication failed"
**Cause**: Incorrect database credentials.
- **Fix**: Double-check the username and password in your `DATABASE_URL` connection string.

---

## 🔑 Authentication Issues

### "Invalid Token" or Auto-logout
**Cause**: JWT token expired or the server secret changed.
- **Fix**: Clear `localStorage` in your browser (Application tab -> Local Storage) and log in again.
- **Fix**: Ensure `jwtSecret` in `server/.env` is consistent and hasn't changed.

### Login persists across Incognito windows
**Cause**: Sharing `localStorage` within the same Incognito session.
- **Fix**: Close *all* Incognito windows before opening a new one to ensure a fresh session.

---

## 📊 Feature Issues

### "Team Attendance" option missing
**Cause**: The feature might be disabled in global settings.
- **Fix**: Login as Admin, go to Settings, and toggle "Team Feature Enabled" to ON.

### Excel Upload Fails
**Cause**: Invalid file format or missing columns.
- **Fix**: Ensure your Excel file has headers: `system_id`, `name`. Optional: `team_id`.

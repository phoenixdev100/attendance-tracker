# 📡 API Reference

This document outlines the REST API endpoints available in the Attendance Tracker.

**Base URL**: `http://localhost:3000` (Development)

## 🔐 Authentication

### Login
Authenticate a user and receive a JWT token.

- **Endpoint**: `POST /api/login`
- **Body**:
  ```json
  {
    "username": "admin",
    "password": "password123"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "user": { "id": 1, "username": "admin", "role": "admin", ... },
    "token": "jwt_token_string"
  }
  ```

---

## 👥 User Management (Admin Only)

### Get All Users
- **Endpoint**: `GET /api/users`
- **Response**: List of all system users.

### Create User
- **Endpoint**: `POST /api/users`
- **Body**:
  ```json
  {
    "username": "newstaff",
    "password": "password123",
    "role": "user",
    "name": "Staff Name"
  }
  ```

### Update User
- **Endpoint**: `PUT /api/users/:id`
- **Body**: Fields to update (name, role, password).

### Delete User
- **Endpoint**: `DELETE /api/users/:id`

---

## 📝 Attendance

### Get Student Details
Look up a student by their System ID.
- **Endpoint**: `GET /api/students/:systemId`

### Get Team Details
Look up students belonging to a specific Team ID.
- **Endpoint**: `GET /api/teams/:teamId`

### Mark Attendance
Mark a student or team as present.
- **Endpoint**: `POST /api/attendance`
- **Body**:
  ```json
  {
    "systemId": "SYS123",
    "timestamp": "2023-10-27T10:00:00Z"
  }
  ```

### Mark Mark Absent
Mark a student as absent (Admin override).
- **Endpoint**: `POST /api/mark-absent`
- **Body**: `{ "systemId": "SYS123" }`

### Get Today's Stats
Get summary of attendance for the current day.
- **Endpoint**: `GET /api/today-stats`

### Export Excel
Download attendance report as .xlsx.
- **Endpoint**: `GET /api/export-excel`

---

## ⚙️ Settings

### Get All Settings
- **Endpoint**: `GET /api/settings`

### Get Single Setting
- **Endpoint**: `GET /api/settings/:key`

### Update Setting (Admin Only)
- **Endpoint**: `PUT /api/settings/:key`
- **Body**: `{ "value": "true" }`

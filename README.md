<div align="center">

# 📊 Attendance Tracker

### A Modern, Efficient, and Secure Attendance Management System

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg?style=for-the-badge)
![License](https://img.shields.io/badge/license-MIT-green.svg?style=for-the-badge)
![Status](https://img.shields.io/badge/status-active-success.svg?style=for-the-badge)

</div>

---

## 📖 Table of Contents
- [About the Project](#-about-the-project)
- [Key Features](#-key-features)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
- [Configuration](#-configuration)
- [Documentation](#-documentation)
- [Authors](#-authors)

---

## 📝 About the Project

**Attendance Tracker** is a full-stack web application designed to streamline the attendance tracking process for educational institutions and organizations. It replaces traditional manual methods with a digital, automated, and error-free system. 

Built with scalability and user experience in mind, it separates admin and user roles to ensure secure data handling and easy management.

---

## ✨ Key Features

### 👨‍💼 For Administrators
- **Dashboard Overview**: Real-time statistics of total, present, and absent students.
- **User Management**: Create, edit, delete, and view system users (Admins & Regular Users).
- **Attendance Monitoring**: View detailed attendance logs and modify records if necessary.
- **Excel Export**: Download daily attendance reports in Excel format.
- **Bulk Upload**: Upload student data via Excel files for quick system population.
- **Settings Control**: Toggle features like "Team Attendance" on/off globally.

### 👤 For Users (Staff/Faculty)
- **Easy Marking**: Mark attendance by individual Student ID or by entire Teams.
- **Responsive Interface**: Works seamlessly on desktop and mobile devices.
- **Secure Access**: Role-based redirection and protected routes.

---

## 🛠 Tech Stack

| Component | Technology | Description |
|-----------|------------|-------------|
| **Frontend** | React.js | Component-based UI library |
| **Styling** | CSS3 | Custom responsive design |
| **Backend** | Node.js & Express | RESTful API server |
| **Database** | PostgreSQL | Relational database management |
| **Authentication**| JSON Web Tokens | Secure stateless authentication |

---

## 🚀 Getting Started

To get a local copy up and running, follow these simple steps.

### Prerequisites
* Node.js (v14+)
* npm or yarn
* PostgreSQL Database (Local or Cloud like Neon/Supabase)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/phoenixdev100/attendance-tracker.git
   ```

2. **Install Server Dependencies**
   ```bash
   cd server
   npm install
   ```

3. **Install Client Dependencies**
   ```bash
   cd ../client
   npm install
   ```

---

## ⚙️ Configuration

You need to configure environment variables for both the client and server.

### Server (.env)
Create a `.env` file in the `server` directory:
```env
PORT=3000
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require
NODE_ENV=development
CORS_ORIGIN=http://localhost:3001
jwtSecret=your_jwt_secret_key
```

### Client (.env)
Create a `.env` file in the `client` directory:
```env
PORT=3001
REACT_APP_API_URL=http://localhost:3000
```

---

## 📚 Documentation

For more detailed information, please refer to the specific documentation files:

| Document | Description |
|----------|-------------|
| [**Setup Guide**](./SETUP_GUIDE.md) | Detailed step-by-step installation and setup instructions. |
| [**API Reference**](./API_REFERENCE.md) | Comprehensive list of API endpoints, parameters, and responses. |
| [**Architecture**](./ARCHITECTURE.md) | High-level system design, database schema, and data flow. |
| [**Contributing**](./CONTRIBUTING.md) | Guidelines for contributing to this project. |

---

## 👥 Authors

* **Admin** - *Initial Work*

<div align="center">
  <br />
  <p>Made with ❤️ by Deepak</p>
</div>

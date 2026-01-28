# 📜 Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2023-10-27

### Added
- **Authentication System**:
  - JWT-based login for Admins and Users.
  - Role-based route protection.
  - Secure password hashing.
- **Admin Dashboard**:
  - Daily attendance statistics (Total, Present, Absent).
  - Visualization charts for attendance rates.
  - "Hide Statistics" toggle for cleaner UI.
- **User Management**:
  - CRUD operations for managing system users.
  - Option to delete users (protected to prevent admin lockout).
- **Attendance Features**:
  - Individual student marking via System ID.
  - Batch team marking via Team ID.
  - Admin override to mark students absent.
  - "Team Feature" global toggle in settings.
- **Data Handling**:
  - Bulk upload student data via Excel (.xlsx).
  - Export daily attendance reports to Excel.
- **Infrastructure**:
  - Centralized API configuration.
  - Environment variable support for CORS and DB connections.
  - Comprehensive documentation suite.

### Changed
- Standardized API calls to use a central config instance.
- Improved error handling across all forms.
- Enhanced UX with loading states and success/error alerts.

### Security
- Implemented rate limiting (configurable).
- Added Helmet for HTTP headers.
- Configured strict CORS policies.

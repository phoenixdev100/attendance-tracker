# 🛡️ Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take the security of our attendance system seriously. If you find a vulnerability, please follow these steps:

1.  **Do NOT open a public issue.**
2.  Email the project administrators immediately.
3.  Include steps to reproduce the issue.

## Key Security Features Implemented

- **Password Hashing**: We use `bcrypt` with salt rounds to hash all user passwords. No plain text passwords are stored.
- **JWT Authentication**: Stateless authentication using JSON Web Tokens (HS256 algorithm).
- **Environment Variables**: Sensitive data (Database URLs, JWT Secrets) are stored in `.env` files and never committed to version control.
- **SQL Injection Protection**: All database queries use parameterized queries (prepared statements) via the `pg` library to prevent injection attacks.
- **XSS Protection**: React's built-in escaping mechanisms protect against Cross-Site Scripting in the frontend.
- **Helmet**: Express middleware sets secure HTTP headers.
- **CORS**: Configured to only allow requests from the specific frontend origin.

## Best Practices for Admins

1.  Change default credentials (`admin/admin123`) immediately after deployment.
2.  Use strong, unique passwords for all staff accounts.
3.  Ensure your `.env` file permissions are restricted on the server.

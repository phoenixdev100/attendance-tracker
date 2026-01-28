# 🤝 Contributing to Attendance Tracker

We welcome contributions to make this project better! Here's how you can help.

## 🧪 Development Workflow

1.  **Fork** the repository.
2.  **Clone** your fork locally.
3.  **Create a Branch** for your feature or bug fix:
    ```bash
    git checkout -b feature/amazing-feature
    ```
4.  **Make Changes** and commit them:
    ```bash
    git commit -m "Add some amazing feature"
    ```
5.  **Push** to your fork:
    ```bash
    git push origin feature/amazing-feature
    ```
6.  **Open a Pull Request** against the `main` branch.

## 📐 Coding Standards

### Frontend (React)
- Use Functional Components and Hooks.
- Keep components small and focused.
- Use `camelCase` for variables and functions, `PascalCase` for components.
- Centralize API calls in `config/api.js` or dedicated service files.
- Put styles in separate CSS files or use modular CSS.

### Backend (Node/Express)
- Follow RESTful API design principles.
- Use `async/await` for database operations.
- Always handle errors with `try/catch` blocks.
- Keep route handlers clean; move complex logic to controller functions if possible.

## 🐞 Reporting Bugs

If you find a bug, please create an Issue with:
1.  Description of the bug.
2.  Steps to reproduce.
3.  Expected vs. Actual behavior.
4.  Screenshots (if applicable).

## 💡 Feature Requests

Have an idea? Open an Issue tagged "enhancement" and describe what you'd like to see!

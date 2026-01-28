# 🚀 Deployment Guide

This guide covers how to deploy the Attendance Tracker to a production environment.

## 📦 General Strategy

Since this is a full-stack application with a separate frontend (Client) and backend (Server), you have two main deployment strategies:

1.  **Unified Deployment**: Serve the React build files *from* the Node.js server. (Simplest for single VPS)
2.  **Separate Deployment**: Host Frontend on Vercel/Netlify and Backend on Render/Heroku/Railway. (Recommended for scalability)

---

## Option 1: Separate Deployment (Recommended)

### 1. Backend (Server)

**Platforms**: Render, Railway, Heroku, or AWS EC2.

1.  **Push code to GitHub**.
2.  **Create a new Web Service** on your chosen platform.
3.  **Root Directory**: Set to `./server`.
4.  **Build Command**: `npm install`
5.  **Start Command**: `node server.js`
6.  **Environment Variables**:
    - `DATABASE_URL`: Connection string from your cloud database (e.g., Neon.tech, Supabase).
    - `NODE_ENV`: `production`
    - `jwtSecret`: A long, random string.
    - `CORS_ORIGIN`: The URL of your frontend (e.g., `https://my-attendance-app.vercel.app`).

### 2. Frontend (Client)

**Platforms**: Vercel, Netlify, or Cloudflare Pages.

1.  **Import GitHub Repo** to Vercel/Netlify.
2.  **Root Directory**: Set to `./client`.
3.  **Build Command**: `npm run build`
4.  **Output Directory**: `build`
5.  **Environment Variables**:
    - `REACT_APP_API_URL`: The URL of your deployed backend (e.g., `https://my-api-service.onrender.com`).

---

## Option 2: Unified Deployment (Single Server)

Use this if you have a single VPS (like DigitalOcean Droplet or AWS EC2).

### 1. Build the Frontend
Navigate to the client folder and build the React app:
```bash
cd client
npm install
npm run build
```
This creates a `build` folder.

### 2. Configure Server to Serve Static Files
Move the `build` folder to `server/public`, or update `server.js` to serve static files from `../client/build`.

*In `server.js`:*
```javascript
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
  });
}
```

### 3. Run the Server
Simply run the Node server. It will now serve both the API and the React frontend.
```bash
cd server
npm start
```

---

## 🗄️ Database (PostgreSQL)

For production, **do not use a local database**. Use a managed cloud provider:

- **Neon.tech** (Serverless Postgres) - *Highly Recommended*
- **Supabase**
- **AWS RDS**
- **Heroku Postgres**

Ensure you get the `DATABASE_URL` (Connection String) and add it to your server's environment variables.

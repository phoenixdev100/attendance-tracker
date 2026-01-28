import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import AdminDashboard from './components/AdminDashboard';
import UserDashboard from './components/UserDashboard';
import AttendanceForm from './components/AttendanceForm';
import StatsPage from './components/StatsPage';
import UserManagement from './components/UserManagement';
import SettingsManagement from './components/SettingsManagement';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error('Error parsing stored user:', error);
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    setUser(null);
  };

  if (loading) {
    return (
      <div className="container">
        <div className="card">
          <div className="loading">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <div className="App">
        <Routes>
          {/* Public route */}
          <Route
            path="/login"
            element={
              user ? (
                <Navigate to={user.role === 'admin' ? '/admin' : '/'} replace />
              ) : (
                <Login onLogin={handleLogin} />
              )
            }
          />

          {/* Admin routes */}
          <Route
            path="/admin"
            element={
              user && user.role === 'admin' ? (
                <AdminDashboard user={user} onLogout={handleLogout} />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />

          <Route
            path="/attendance"
            element={
              user ? (
                user.role === 'admin' ? (
                  <AttendanceForm user={user} onLogout={handleLogout} showAdminNav={true} />
                ) : (
                  <AttendanceForm user={user} onLogout={handleLogout} isUserDashboard={true} />
                )
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />

          <Route
            path="/stats"
            element={
              user && user.role === 'admin' ? (
                <StatsPage />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />

          <Route
            path="/settings"
            element={
              user && user.role === 'admin' ? (
                <div className="container">
                  <div className="card" style={{ maxWidth: '900px' }}>
                    <SettingsManagement />
                  </div>
                </div>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />

          <Route
            path="/users"
            element={
              user && user.role === 'admin' ? (
                <div className="container">
                  <div className="card" style={{ maxWidth: '1200px' }}>
                    <UserManagement />
                  </div>
                </div>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />

          {/* User routes */}
          <Route
            path="/"
            element={
              user ? (
                user.role === 'admin' ? (
                  <Navigate to="/admin" replace />
                ) : (
                  <UserDashboard user={user} onLogout={handleLogout} />
                )
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />

          {/* Catch all */}
          <Route
            path="*"
            element={<Navigate to={user ? (user.role === 'admin' ? '/admin' : '/') : '/login'} replace />}
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;

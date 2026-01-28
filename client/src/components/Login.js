import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../config/api';
import Alert from './Alert';

const Login = ({ onLogin }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [alert, setAlert] = useState(null);
    const navigate = useNavigate();

    const showAlert = (message, type) => {
        setAlert({ message, type });
        setTimeout(() => setAlert(null), 5000);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!username || !password) {
            showAlert('Please enter both username and password', 'warning');
            return;
        }

        setLoading(true);

        try {
            const response = await api.post('/api/login', { username, password });
            const data = response.data;

            if (data.success) {
                // Store user info in localStorage
                localStorage.setItem('user', JSON.stringify(data.user));
                localStorage.setItem('token', data.token);

                // Call parent onLogin callback
                onLogin(data.user);

                // Navigate based on role
                if (data.user.role === 'admin') {
                    navigate('/admin');
                } else {
                    navigate('/attendance');
                }

                showAlert('Login successful!', 'success');
            } else {
                showAlert(data.message || 'Invalid credentials', 'error');
            }
        } catch (error) {
            console.error('Login error:', error);
            const message = error.response?.data?.message || 'Network error. Please try again.';
            showAlert(message, 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container">
            <div className="card">
                <div className="header">
                    <div className="title-section">
                        <h1 className="main-title">🔐 Login</h1>
                        <p className="subtitle">Attendance Tracker</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="username" className="form-label">
                            Username:
                        </label>
                        <input
                            type="text"
                            id="username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Enter your username"
                            className="form-input"
                            disabled={loading}
                            autoComplete="username"
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password" className="form-label">
                            Password:
                        </label>
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter your password"
                            className="form-input"
                            disabled={loading}
                            autoComplete="current-password"
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn btn-present"
                        disabled={loading}
                        style={{ width: '100%' }}
                    >
                        {loading ? 'Logging in...' : '🔓 Login'}
                    </button>
                </form>

                {alert && (
                    <Alert
                        message={alert.message}
                        type={alert.type}
                        onClose={() => setAlert(null)}
                    />
                )}
            </div>
        </div>
    );
};

export default Login;
